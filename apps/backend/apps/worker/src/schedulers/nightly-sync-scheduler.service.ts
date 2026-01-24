import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { NightlySyncJobData } from '../processors/nightly-sync.processor';

@Injectable()
export class NightlySyncSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(NightlySyncSchedulerService.name);

  constructor(
    @InjectQueue('sync-scheduler')
    private syncSchedulerQueue: Queue<NightlySyncJobData>
  ) {}

  async onModuleInit() {
    try {
      const repeatableJobs = await this.syncSchedulerQueue.getRepeatableJobs();
      const existingJob = repeatableJobs.find(
        (job) => job.name === 'nightly-sync'
      );

      if (existingJob) {
        this.logger.log('Nightly sync job already scheduled. Skipping.');
        return;
      }

      await this.syncSchedulerQueue.add(
        'nightly-sync',
        {},
        {
          repeat: {
            pattern: '0 0 * * *',
            tz: 'UTC',
          },
          jobId: 'nightly-sync-recurring',
        }
      );

      this.logger.log('Scheduled nightly sync job to run daily at 00:00 UTC');
    } catch (error: any) {
      this.logger.error(
        `Failed to schedule nightly sync job: ${error.message}`,
        error.stack
      );
    }
  }
}
