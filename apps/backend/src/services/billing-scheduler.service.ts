import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MonthlyBillingJobData } from '../processors/billing.processor';

/**
 * Service to schedule monthly billing jobs
 */
@Injectable()
export class BillingSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(BillingSchedulerService.name);

  constructor(
    @InjectQueue('billing')
    private billingQueue: Queue<MonthlyBillingJobData>
  ) {}

  /**
   * Schedule monthly billing job on module initialization
   * Job runs on the 1st day of each month at 00:00 UTC
   */
  async onModuleInit() {
    try {
      // Check if repeatable job already exists
      const repeatableJobs = await this.billingQueue.getRepeatableJobs();
      const existingJob = repeatableJobs.find(
        (job) => job.name === 'monthly-billing'
      );

      if (existingJob) {
        this.logger.log('Monthly billing job already scheduled. Skipping.');
        return;
      }

      // Schedule repeatable job: runs on 1st day of month at 00:00 UTC
      // Cron pattern: "0 0 1 * *" = minute 0, hour 0, day 1, every month
      // Billing period dates will be calculated dynamically when the job runs
      await this.billingQueue.add(
        'monthly-billing',
        {}, // Empty data - billing period will be calculated in processor
        {
          repeat: {
            pattern: '0 0 1 * *', // 1st day of month at 00:00 UTC
            tz: 'UTC',
          },
          jobId: 'monthly-billing-recurring',
        }
      );

      this.logger.log(
        'Scheduled monthly billing job to run on 1st day of each month at 00:00 UTC'
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to schedule monthly billing job: ${error.message}`,
        error.stack
      );
      // Don't throw - allow app to start even if scheduling fails
      // The job can be manually scheduled later
    }
  }
}
