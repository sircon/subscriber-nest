import { BillingSubscriptionService } from '@app/core/billing/billing-subscription.service';
import { SubscriberSyncService } from '@app/core/sync/subscriber-sync.service';
import { EspConnection, EspSyncStatus } from '@app/database/entities/esp-connection.entity';
import { Subscriber } from '@app/database/entities/subscriber.entity';
import { SyncHistory, SyncHistoryStatus } from '@app/database/entities/sync-history.entity';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';

export interface SyncPublicationJobData {
  espConnectionId: string;
}

@Processor('subscriber-sync')
@Injectable()
export class SubscriberSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SubscriberSyncProcessor.name);

  constructor(
    @InjectRepository(EspConnection)
    private espConnectionRepository: Repository<EspConnection>,
    @InjectRepository(SyncHistory)
    private syncHistoryRepository: Repository<SyncHistory>,
    @InjectRepository(Subscriber)
    private subscriberRepository: Repository<Subscriber>,
    private subscriberSyncService: SubscriberSyncService,
    private billingSubscriptionService: BillingSubscriptionService
  ) {
    super();
  }

  async process(job: Job<SyncPublicationJobData>): Promise<void> {
    if (job.name !== 'sync-publication') {
      throw new Error(`Unknown job type: ${job.name}`);
    }

    const { espConnectionId } = job.data;

    this.logger.log(
      `Processing sync job ${job.id} for ESP connection ${espConnectionId}`
    );

    // Check if user has an active subscription before processing
    const espConnection = await this.espConnectionRepository.findOne({
      where: { id: espConnectionId },
    });

    if (!espConnection) {
      throw new Error(`ESP connection ${espConnectionId} not found`);
    }

    const hasActiveSubscription =
      await this.billingSubscriptionService.hasActiveSubscription(
        espConnection.userId
      );

    if (!hasActiveSubscription) {
      this.logger.warn(
        `Rejecting sync job for ESP connection ${espConnectionId}: user ${espConnection.userId} does not have an active subscription`
      );
      // Reset sync status to idle since we're not actually syncing
      await this.espConnectionRepository.update(
        { id: espConnectionId },
        { syncStatus: EspSyncStatus.IDLE }
      );
      throw new Error(
        'Active subscription required to sync subscribers. Please subscribe to continue.'
      );
    }

    // Create sync history record at start with optimistic 'success' status
    const syncHistory = this.syncHistoryRepository.create({
      espConnectionId,
      status: SyncHistoryStatus.SUCCESS,
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    });
    await this.syncHistoryRepository.save(syncHistory);

    try {
      await this.subscriberSyncService.syncSubscribers(espConnectionId);

      await this.espConnectionRepository.update(
        { id: espConnectionId },
        { lastSyncedAt: new Date(), syncStatus: EspSyncStatus.SYNCED }
      );

      const subscriberCount = await this.subscriberRepository.count({
        where: { espConnectionId },
      });

      await this.syncHistoryRepository.update(
        { id: syncHistory.id },
        { completedAt: new Date(), subscriberCount }
      );

      this.logger.log(
        `Successfully synced subscribers for ESP connection ${espConnectionId}`
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to sync subscribers for ESP connection ${espConnectionId}: ${error.message}`,
        error.stack
      );

      try {
        await this.espConnectionRepository.update(
          { id: espConnectionId },
          { syncStatus: EspSyncStatus.ERROR }
        );
      } catch (updateError: any) {
        this.logger.error(
          `Failed to update syncStatus to 'error' for ESP connection ${espConnectionId}: ${updateError.message}`
        );
      }

      const maxAttempts = job.opts.attempts || 1;
      const isFinalAttempt = job.attemptsMade >= maxAttempts;

      if (isFinalAttempt) {
        try {
          await this.syncHistoryRepository.update(
            { id: syncHistory.id },
            {
              status: SyncHistoryStatus.FAILED,
              completedAt: new Date(),
              errorMessage: error.message,
            }
          );
        } catch (updateError: any) {
          this.logger.error(
            `Failed to update sync history to 'failed' for ESP connection ${espConnectionId}: ${updateError.message}`
          );
        }
      }

      throw error;
    }
  }
}
