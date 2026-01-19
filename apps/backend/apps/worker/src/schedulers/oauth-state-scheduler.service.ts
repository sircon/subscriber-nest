import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OAuthStateCleanupJobData } from '../processors/oauth-state-cleanup.processor';

/**
 * Service to schedule hourly OAuth state cleanup jobs
 */
@Injectable()
export class OAuthStateSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(OAuthStateSchedulerService.name);

  constructor(
    @InjectQueue('oauth-state-cleanup')
    private oauthStateCleanupQueue: Queue<OAuthStateCleanupJobData>
  ) {}

  /**
   * Schedule hourly OAuth state cleanup job on module initialization
   * Job runs every hour at minute 0 to clean up expired OAuth states
   */
  async onModuleInit() {
    try {
      // Check if repeatable job already exists
      const repeatableJobs =
        await this.oauthStateCleanupQueue.getRepeatableJobs();
      const existingJob = repeatableJobs.find(
        (job) => job.name === 'oauth-state-cleanup'
      );

      if (existingJob) {
        this.logger.log('OAuth state cleanup job already scheduled. Skipping.');
        return;
      }

      // Schedule repeatable job: runs every hour at minute 0
      // Cron pattern: "0 * * * *" = minute 0, every hour
      await this.oauthStateCleanupQueue.add(
        'oauth-state-cleanup',
        {}, // Empty data - will process all expired states
        {
          repeat: {
            pattern: '0 * * * *', // Every hour at minute 0
            tz: 'UTC',
          },
          jobId: 'oauth-state-cleanup-recurring',
        }
      );

      this.logger.log(
        'Scheduled OAuth state cleanup job to run every hour at minute 0 UTC'
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to schedule OAuth state cleanup job: ${error.message}`,
        error.stack
      );
      // Don't throw - allow app to start even if scheduling fails
      // The job can be manually scheduled later
    }
  }
}
