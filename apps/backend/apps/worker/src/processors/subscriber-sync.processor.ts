import { BillingSubscriptionService } from '@app/core/billing/billing-subscription.service';
import { SubscriberSyncService } from '@app/core/sync/subscriber-sync.service';
import {
  EspConnection,
  EspSyncStatus,
  AuthMethod,
} from '@app/database/entities/esp-connection.entity';
import { Subscriber } from '@app/database/entities/subscriber.entity';
import {
  SyncHistory,
  SyncHistoryStatus,
} from '@app/database/entities/sync-history.entity';
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

    // Sync history is created per publication in the service for both API key and OAuth connections
    // No need to create sync history here

    try {
      // Sync subscribers using the sync service
      // This creates sync history records per publication for both API key and OAuth connections
      await this.subscriberSyncService.syncSubscribers(espConnectionId);

      await this.espConnectionRepository.update(
        { id: espConnectionId },
        { lastSyncedAt: new Date(), syncStatus: EspSyncStatus.SYNCED }
      );

      this.logger.log(
        `Successfully synced subscribers for ESP connection ${espConnectionId}`
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to sync subscribers for ESP connection ${espConnectionId}: ${error.message}`,
        error.stack
      );

      // Determine overall sync status
      // Check if any publication sync history records succeeded (works for both API key and OAuth)
      let overallStatus = EspSyncStatus.ERROR;
      // Get all sync histories for this connection created in the last 5 minutes
      // (to catch the syncs that just happened)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentSyncs = await this.syncHistoryRepository.find({
        where: {
          espConnectionId,
        },
        order: { startedAt: 'DESC' },
      });
      // Filter to recent syncs (within last 5 minutes)
      const recentPublicationSyncs = recentSyncs.filter(
        (sh) => sh.startedAt >= fiveMinutesAgo && sh.publicationId !== null
      );
      // If at least one publication succeeded, mark as synced (partial success)
      // If all failed, mark as error
      const hasSuccessfulSync = recentPublicationSyncs.some(
        (sh) => sh.status === SyncHistoryStatus.SUCCESS && sh.completedAt
      );
      overallStatus = hasSuccessfulSync
        ? EspSyncStatus.SYNCED
        : EspSyncStatus.ERROR;

      // Update syncStatus based on overall result
      try {
        await this.espConnectionRepository.update(
          { id: espConnectionId },
          { syncStatus: overallStatus }
        );
      } catch (updateError: any) {
        this.logger.error(
          `Failed to update syncStatus for ESP connection ${espConnectionId}: ${updateError.message}`
        );
      }

      // Sync history is managed per publication in the service, so no need to update here

      throw error;
    }
  }
}
