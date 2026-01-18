import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { AccountDeletionJobData } from "../processors/account-deletion.processor";

/**
 * Service to schedule daily account deletion jobs
 * Job runs daily at 00:00 UTC to check for users with deleteRequestedAt older than 30 days
 */
@Injectable()
export class AccountDeletionSchedulerService {
  private readonly logger = new Logger(AccountDeletionSchedulerService.name);

  constructor(
    @InjectQueue("account-deletion")
    private accountDeletionQueue: Queue<AccountDeletionJobData>,
  ) {}

  /**
   * Runs daily at 00:00 UTC
   * Checks for users with deleteRequestedAt older than 30 days and processes account deletion
   */
  @Cron("0 0 * * *", { timeZone: "UTC" })
  async runAccountDeletion(): Promise<void> {
    this.logger.log("Starting daily account deletion job");

    try {
      // Add account deletion job to queue
      // Empty data - will process all eligible users
      await this.accountDeletionQueue.add("account-deletion", {});

      this.logger.log("Successfully queued account deletion job");
    } catch (error: any) {
      // Handle errors gracefully (logs but doesn't crash)
      this.logger.error(
        `Failed to queue account deletion job: ${error.message}`,
        error.stack,
      );
    }
  }
}
