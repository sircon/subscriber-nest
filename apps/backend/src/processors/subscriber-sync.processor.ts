import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import {
  EspConnection,
  EspSyncStatus,
  AuthMethod,
} from '../entities/esp-connection.entity';
import {
  SyncHistory,
  SyncHistoryStatus,
} from '../entities/sync-history.entity';
import { Subscriber } from '../entities/subscriber.entity';
import { SubscriberSyncService } from '../services/subscriber-sync.service';
import { BillingSubscriptionService } from '../services/billing-subscription.service';

export interface SyncPublicationJobData {
  espConnectionId: string;
}

/**
 * Processor for handling subscriber sync jobs from the subscriber-sync queue
 */
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

  /**
   * Processes a sync-publication job
   * - Creates sync history record at start
   * - Retrieves ESP connection from database
   * - Decrypts API key
   * - Uses ESP connector to fetch all subscribers
   * - Processes subscribers in batches and saves to database
   * - Updates ESP connection lastSyncedAt timestamp and syncStatus to 'synced' on success
   * - Updates sync history with completedAt on success
   * - Updates syncStatus to 'error' on failure
   * - Updates sync history with failed status and error message on final failure
   *
   * @param job - The job containing espConnectionId
   */
  async process(job: Job<SyncPublicationJobData>): Promise<void> {
    // Handle sync-publication job type
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

    // For OAuth connections, sync history is created per publication in the service
    // For API key connections, create sync history here
    let syncHistory: SyncHistory | null = null;
    if (espConnection.authMethod === AuthMethod.API_KEY) {
      // Create sync history record at start with optimistic 'success' status
      syncHistory = this.syncHistoryRepository.create({
        espConnectionId,
        publicationId: null, // API key connections have single publication
        status: SyncHistoryStatus.SUCCESS,
        startedAt: new Date(),
        completedAt: null,
        errorMessage: null,
      });
      await this.syncHistoryRepository.save(syncHistory);
    }

    try {
      // Sync subscribers using the sync service
      // For OAuth connections, this creates sync history records per publication
      await this.subscriberSyncService.syncSubscribers(espConnectionId);

      // Update lastSyncedAt timestamp and syncStatus to 'synced' on success
      await this.espConnectionRepository.update(
        { id: espConnectionId },
        { lastSyncedAt: new Date(), syncStatus: EspSyncStatus.SYNCED }
      );

      // For API key connections, update the sync history record
      if (syncHistory) {
        // Count subscribers for the specific ESP connection after successful sync
        const subscriberCount = await this.subscriberRepository.count({
          where: { espConnectionId },
        });

        // Update sync history with completedAt timestamp and subscriber count
        await this.syncHistoryRepository.update(
          { id: syncHistory.id },
          { completedAt: new Date(), subscriberCount }
        );
      }

      this.logger.log(
        `Successfully synced subscribers for ESP connection ${espConnectionId}`
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to sync subscribers for ESP connection ${espConnectionId}: ${error.message}`,
        error.stack
      );

      // Determine overall sync status
      // For OAuth connections, check if any publication sync history records succeeded
      let overallStatus = EspSyncStatus.ERROR;
      if (espConnection.authMethod === AuthMethod.OAUTH) {
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
      }

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

      // For API key connections, update sync history on final failure
      if (syncHistory) {
        // Check if this is the final attempt (after all retries)
        const maxAttempts = job.opts.attempts || 1;
        const isFinalAttempt = job.attemptsMade >= maxAttempts;

        if (isFinalAttempt) {
          // Update sync history with failed status and error message
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
      }

      // Re-throw error so BullMQ can handle retries
      throw error;
    }
  }
}
