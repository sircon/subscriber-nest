import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AccountDeletionJobData } from '../processors/account-deletion.processor';

/**
 * Service to schedule daily account deletion jobs
 */
@Injectable()
export class AccountDeletionSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(AccountDeletionSchedulerService.name);

  constructor(
    @InjectQueue('account-deletion')
    private accountDeletionQueue: Queue<AccountDeletionJobData>,
  ) {}

  /**
   * Schedule daily account deletion job on module initialization
   * Job runs daily at 00:00 UTC to check for users with deleteRequestedAt older than 30 days
   */
  async onModuleInit() {
    try {
      // Check if repeatable job already exists
      const repeatableJobs = await this.accountDeletionQueue.getRepeatableJobs();
      const existingJob = repeatableJobs.find(
        (job) => job.name === 'account-deletion',
      );

      if (existingJob) {
        this.logger.log('Account deletion job already scheduled. Skipping.');
        return;
      }

      // Schedule repeatable job: runs daily at 00:00 UTC
      // Cron pattern: "0 0 * * *" = minute 0, hour 0, every day
      await this.accountDeletionQueue.add(
        'account-deletion',
        {}, // Empty data - will process all eligible users
        {
          repeat: {
            pattern: '0 0 * * *', // Daily at 00:00 UTC
            tz: 'UTC',
          },
          jobId: 'account-deletion-recurring',
        },
      );

      this.logger.log(
        'Scheduled account deletion job to run daily at 00:00 UTC',
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to schedule account deletion job: ${error.message}`,
        error.stack,
      );
      // Don't throw - allow app to start even if scheduling fails
      // The job can be manually scheduled later
    }
  }
}
