import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AccountDeletionJobData } from '../processors/account-deletion.processor';

@Injectable()
export class AccountDeletionSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(AccountDeletionSchedulerService.name);

  constructor(
    @InjectQueue('account-deletion')
    private accountDeletionQueue: Queue<AccountDeletionJobData>
  ) {}

  async onModuleInit() {
    try {
      const repeatableJobs =
        await this.accountDeletionQueue.getRepeatableJobs();
      const existingJob = repeatableJobs.find(
        (job) => job.name === 'account-deletion'
      );

      if (existingJob) {
        this.logger.log('Account deletion job already scheduled. Skipping.');
        return;
      }

      await this.accountDeletionQueue.add(
        'account-deletion',
        {},
        {
          repeat: {
            pattern: '0 0 * * *',
            tz: 'UTC',
          },
          jobId: 'account-deletion-recurring',
        }
      );

      this.logger.log(
        'Scheduled account deletion job to run daily at 00:00 UTC'
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to schedule account deletion job: ${error.message}`,
        error.stack
      );
    }
  }
}
