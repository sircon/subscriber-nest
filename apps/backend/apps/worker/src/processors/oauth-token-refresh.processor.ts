import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import {
  EspConnection,
  AuthMethod,
} from '@app/database/entities/esp-connection.entity';
import { OAuthTokenRefreshService } from '@app/core/oauth/oauth-token-refresh.service';

export interface OAuthTokenRefreshJobData {
  // Empty - job processes all connections with tokens expiring soon
}

/**
 * Processor for handling OAuth token refresh jobs
 * Proactively refreshes OAuth tokens before they expire
 */
@Processor('oauth-token-refresh')
@Injectable()
export class OAuthTokenRefreshProcessor extends WorkerHost {
  private readonly logger = new Logger(OAuthTokenRefreshProcessor.name);

  constructor(
    @InjectRepository(EspConnection)
    private espConnectionRepository: Repository<EspConnection>,
    private oauthTokenRefreshService: OAuthTokenRefreshService
  ) {
    super();
  }

  /**
   * Processes an OAuth token refresh job
   * Finds all OAuth connections with tokens expiring within 10 minutes and refreshes them
   *
   * @param job - The token refresh job
   */
  async process(job: Job<OAuthTokenRefreshJobData>): Promise<void> {
    // Handle oauth-token-refresh job type
    if (job.name !== 'oauth-token-refresh') {
      throw new Error(`Unknown job type: ${job.name}`);
    }

    this.logger.log(`Processing OAuth token refresh job ${job.id}`);

    try {
      // Calculate the threshold time (10 minutes from now)
      const thresholdTime = new Date();
      thresholdTime.setMinutes(thresholdTime.getMinutes() + 10);

      // Find all OAuth connections with tokens expiring within 10 minutes
      const connectionsToRefresh = await this.espConnectionRepository.find({
        where: {
          authMethod: AuthMethod.OAUTH,
          tokenExpiresAt: LessThanOrEqual(thresholdTime),
        },
      });

      this.logger.log(
        `Found ${connectionsToRefresh.length} OAuth connections with tokens expiring within 10 minutes`
      );

      // Refresh tokens for each connection
      let successCount = 0;
      let errorCount = 0;

      for (const connection of connectionsToRefresh) {
        try {
          await this.oauthTokenRefreshService.refreshToken(connection);
          successCount++;
          this.logger.log(
            `Successfully refreshed token for connection ${connection.id} (${connection.espType})`
          );
        } catch (error: any) {
          errorCount++;
          this.logger.error(
            `Failed to refresh token for connection ${connection.id} (${connection.espType}): ${error.message}`,
            error.stack
          );
          // Continue processing other connections even if one fails
        }
      }

      this.logger.log(
        `Completed OAuth token refresh job ${job.id}. Success: ${successCount}, Errors: ${errorCount}`
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to process OAuth token refresh job ${job.id}: ${error.message}`,
        error.stack
      );

      // Check if this is the final attempt (after all retries)
      const maxAttempts = job.opts.attempts || 1;
      const isFinalAttempt = job.attemptsMade >= maxAttempts;

      if (isFinalAttempt) {
        this.logger.error(
          `OAuth token refresh job ${job.id} failed after all retries. Manual intervention may be required.`
        );
      }

      // Re-throw error so BullMQ can handle retries
      throw error;
    }
  }
}
