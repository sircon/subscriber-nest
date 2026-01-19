import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MonthlyBillingJobData } from '../processors/billing.processor';

@Injectable()
export class BillingSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(BillingSchedulerService.name);

  constructor(
    @InjectQueue('billing')
    private billingQueue: Queue<MonthlyBillingJobData>
  ) {}

  async onModuleInit() {
    try {
      const repeatableJobs = await this.billingQueue.getRepeatableJobs();
      const existingJob = repeatableJobs.find(
        (job) => job.name === 'monthly-billing'
      );

      if (existingJob) {
        this.logger.log(
          'Monthly billing usage tracking job already scheduled. Skipping.'
        );
        return;
      }

      await this.billingQueue.add(
        'monthly-billing',
        {},
        {
          repeat: {
            pattern: '0 0 1 * *',
            tz: 'UTC',
          },
          jobId: 'monthly-billing-recurring',
        }
      );

      this.logger.log(
        'Scheduled monthly billing usage tracking job to run on 1st day of each month at 00:00 UTC'
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to schedule monthly billing usage tracking job: ${error.message}`,
        error.stack
      );
    }
  }
}
