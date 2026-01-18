import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { MonthlyBillingJobData } from "../processors/billing.processor";

/**
 * Service to schedule monthly billing usage tracking jobs
 * Note: With metered billing, Stripe handles invoicing automatically.
 * This job only creates usage records for historical tracking purposes.
 */
@Injectable()
export class BillingSchedulerService {
  private readonly logger = new Logger(BillingSchedulerService.name);

  constructor(
    @InjectQueue("billing")
    private billingQueue: Queue<MonthlyBillingJobData>,
  ) {}

  /**
   * Runs on the 1st day of each month at 00:00 UTC
   * Creates BillingUsage records for current month for historical tracking
   * Stripe automatically handles invoicing based on usage records reported via meter
   */
  @Cron("0 0 1 * *", { timeZone: "UTC" })
  async runMonthlyBilling(): Promise<void> {
    this.logger.log(
      "Starting monthly billing usage tracking job for current month",
    );

    try {
      // Add monthly billing job to queue
      // Empty data - current month will be calculated in processor
      await this.billingQueue.add("monthly-billing", {});

      this.logger.log("Successfully queued monthly billing usage tracking job");
    } catch (error: any) {
      // Handle errors gracefully (logs but doesn't crash)
      this.logger.error(
        `Failed to queue monthly billing usage tracking job: ${error.message}`,
        error.stack,
      );
    }
  }
}
