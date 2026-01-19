import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OAuthTokenRefreshJobData } from '../processors/oauth-token-refresh.processor';

/**
 * Service to schedule OAuth token refresh jobs
 * Job runs every 5 minutes to proactively refresh tokens before they expire
 */
@Injectable()
export class OAuthTokenRefreshSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(OAuthTokenRefreshSchedulerService.name);

  constructor(
    @InjectQueue('oauth-token-refresh')
    private oauthTokenRefreshQueue: Queue<OAuthTokenRefreshJobData>
  ) {}

  /**
   * Schedule OAuth token refresh job on module initialization
   * Job runs every 5 minutes to check for tokens expiring within 10 minutes
   */
  async onModuleInit() {
    try {
      // Check if repeatable job already exists
      const repeatableJobs =
        await this.oauthTokenRefreshQueue.getRepeatableJobs();
      const existingJob = repeatableJobs.find(
        (job) => job.name === 'oauth-token-refresh'
      );

      if (existingJob) {
        this.logger.log('OAuth token refresh job already scheduled. Skipping.');
        return;
      }

      // Schedule repeatable job: runs every 5 minutes
      // Cron pattern: "*/5 * * * *" = every 5 minutes
      await this.oauthTokenRefreshQueue.add(
        'oauth-token-refresh',
        {}, // Empty data - will process all connections with tokens expiring soon
        {
          repeat: {
            pattern: '*/5 * * * *', // Every 5 minutes
            tz: 'UTC',
          },
          jobId: 'oauth-token-refresh-recurring',
        }
      );

      this.logger.log(
        'Scheduled OAuth token refresh job to run every 5 minutes UTC'
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to schedule OAuth token refresh job: ${error.message}`,
        error.stack
      );
      // Don't throw - allow app to start even if scheduling fails
      // The job can be manually scheduled later
    }
  }
}
