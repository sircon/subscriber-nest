import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { MonthlyBillingJobData } from "../processors/billing.processor";

/**
 * Service to schedule monthly billing usage tracking jobs
 * Note: With metered billing, Stripe handles invoicing automatically.
 * This job only creates usage records for historical tracking purposes.
 */
@Injectable()
export class BillingSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(BillingSchedulerService.name);

  constructor(
    @InjectQueue("billing")
    private billingQueue: Queue<MonthlyBillingJobData>,
  ) {}

  /**
   * Schedule monthly billing usage tracking job on module initialization
   * Job runs on the 1st day of each month at 00:00 UTC
   * Creates BillingUsage records for current month for historical tracking
   * Stripe automatically handles invoicing based on usage records reported via meter
   */
  async onModuleInit() {
    try {
      // Check if repeatable job already exists
      const repeatableJobs = await this.billingQueue.getRepeatableJobs();
      const existingJob = repeatableJobs.find(
        (job) => job.name === "monthly-billing",
      );

      if (existingJob) {
        this.logger.log(
          "Monthly billing usage tracking job already scheduled. Skipping.",
        );
        return;
      }

      // Schedule repeatable job: runs on 1st day of month at 00:00 UTC
      // Cron pattern: "0 0 1 * *" = minute 0, hour 0, day 1, every month
      // Creates usage records for current month for historical tracking
      await this.billingQueue.add(
        "monthly-billing",
        {}, // Empty data - current month will be calculated in processor
        {
          repeat: {
            pattern: "0 0 1 * *", // 1st day of month at 00:00 UTC
            tz: "UTC",
          },
          jobId: "monthly-billing-recurring",
        },
      );

      this.logger.log(
        "Scheduled monthly billing usage tracking job to run on 1st day of each month at 00:00 UTC",
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to schedule monthly billing usage tracking job: ${error.message}`,
        error.stack,
      );
      // Don't throw - allow app to start even if scheduling fails
      // The job can be manually scheduled later
    }
  }
}
