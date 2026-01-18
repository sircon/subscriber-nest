import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { EspConnection, EspSyncStatus } from '../entities/esp-connection.entity';
import { SyncHistory, SyncHistoryStatus } from '../entities/sync-history.entity';
import { SubscriberSyncService } from '../services/subscriber-sync.service';

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
    private subscriberSyncService: SubscriberSyncService,
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
      `Processing sync job ${job.id} for ESP connection ${espConnectionId}`,
    );

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
      // Sync subscribers using the sync service
      await this.subscriberSyncService.syncSubscribers(espConnectionId);

      // Update lastSyncedAt timestamp and syncStatus to 'synced' on success
      await this.espConnectionRepository.update(
        { id: espConnectionId },
        { lastSyncedAt: new Date(), syncStatus: EspSyncStatus.SYNCED },
      );

      // Update sync history with completedAt timestamp
      await this.syncHistoryRepository.update(
        { id: syncHistory.id },
        { completedAt: new Date() },
      );

      this.logger.log(
        `Successfully synced subscribers for ESP connection ${espConnectionId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to sync subscribers for ESP connection ${espConnectionId}: ${error.message}`,
        error.stack,
      );

      // Update syncStatus to 'error' on failure
      try {
        await this.espConnectionRepository.update(
          { id: espConnectionId },
          { syncStatus: EspSyncStatus.ERROR },
        );
      } catch (updateError: any) {
        this.logger.error(
          `Failed to update syncStatus to 'error' for ESP connection ${espConnectionId}: ${updateError.message}`,
        );
      }

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
            },
          );
        } catch (updateError: any) {
          this.logger.error(
            `Failed to update sync history to 'failed' for ESP connection ${espConnectionId}: ${updateError.message}`,
          );
        }
      }

      // Re-throw error so BullMQ can handle retries
      throw error;
    }
  }
}
