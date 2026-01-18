import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  EspConnection,
  EspConnectionStatus,
} from "@subscriber-nest/shared/entities";

/**
 * Scheduler service that runs a cron job every midnight UTC to automatically
 * queue all active ESP connections for syncing
 */
@Injectable()
export class SyncSchedulerService {
  private readonly logger = new Logger(SyncSchedulerService.name);

  constructor(
    @InjectRepository(EspConnection)
    private espConnectionRepository: Repository<EspConnection>,
    @InjectQueue("subscriber-sync")
    private readonly subscriberSyncQueue: Queue,
  ) {}

  /**
   * Runs every midnight UTC to queue all active ESP connections for syncing
   * Queries database for all ESP connections where status = 'active'
   * For each active connection, adds a sync-publication job to subscriber-sync queue
   */
  @Cron("0 0 * * *", { timeZone: "UTC" })
  async scheduleMidnightSync(): Promise<void> {
    this.logger.log("Starting midnight UTC sync scheduler");

    try {
      // Query database for all ESP connections where status = 'active'
      const activeConnections = await this.espConnectionRepository.find({
        where: { status: EspConnectionStatus.ACTIVE },
      });

      this.logger.log(
        `Found ${activeConnections.length} active ESP connections to sync`,
      );

      // For each active connection, add a sync-publication job to subscriber-sync queue
      let queuedCount = 0;
      for (const connection of activeConnections) {
        try {
          await this.subscriberSyncQueue.add("sync-publication", {
            espConnectionId: connection.id,
          });
          queuedCount++;
        } catch (error: any) {
          // Log error for individual connection but continue processing others
          this.logger.error(
            `Failed to queue sync job for ESP connection ${connection.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      // Log number of connections queued for sync
      this.logger.log(
        `Successfully queued ${queuedCount} of ${activeConnections.length} active ESP connections for sync`,
      );
    } catch (error: any) {
      // Handle errors gracefully (logs but doesn't crash)
      this.logger.error(
        `Failed to run midnight sync scheduler: ${error.message}`,
        error.stack,
      );
    }
  }
}
