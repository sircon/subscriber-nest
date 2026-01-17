import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { EspConnection } from '../entities/esp-connection.entity';
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
    private subscriberSyncService: SubscriberSyncService,
  ) {
    super();
  }

  /**
   * Processes a sync-publication job
   * - Retrieves ESP connection from database
   * - Decrypts API key
   * - Uses ESP connector to fetch all subscribers
   * - Processes subscribers in batches and saves to database
   * - Updates ESP connection lastSyncedAt timestamp on success
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

    try {
      // Sync subscribers using the sync service
      await this.subscriberSyncService.syncSubscribers(espConnectionId);

      // Update lastSyncedAt timestamp on success
      await this.espConnectionRepository.update(
        { id: espConnectionId },
        { lastSyncedAt: new Date() },
      );

      this.logger.log(
        `Successfully synced subscribers for ESP connection ${espConnectionId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to sync subscribers for ESP connection ${espConnectionId}: ${error.message}`,
        error.stack,
      );
      // Re-throw error so BullMQ can handle retries
      throw error;
    }
  }
}
