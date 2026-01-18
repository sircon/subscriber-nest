import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { SyncRequestedEvent } from "@subscriber-nest/shared/events";

/**
 * Event listener service that subscribes to sync events and adds jobs to the queue
 */
@Injectable()
export class SyncEventListenerService {
  private readonly logger = new Logger(SyncEventListenerService.name);

  constructor(
    @InjectQueue("subscriber-sync")
    private readonly subscriberSyncQueue: Queue,
  ) {}

  /**
   * Listens to SyncRequestedEvent and adds a sync-publication job to the subscriber-sync queue
   * @param event - The sync requested event containing espConnectionId and userId
   */
  @OnEvent("SyncRequestedEvent")
  async handleSyncRequested(event: SyncRequestedEvent): Promise<void> {
    this.logger.log(
      `Received sync request event for ESP connection ${event.espConnectionId} from user ${event.userId}`,
    );

    try {
      // Add sync-publication job to subscriber-sync queue
      await this.subscriberSyncQueue.add("sync-publication", {
        espConnectionId: event.espConnectionId,
      });

      this.logger.log(
        `Added sync-publication job to queue for ESP connection ${event.espConnectionId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to add sync job to queue for ESP connection ${event.espConnectionId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
