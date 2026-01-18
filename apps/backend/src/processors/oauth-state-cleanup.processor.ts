import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OAuthStateService } from '../services/oauth-state.service';

export interface OAuthStateCleanupJobData {
  // Empty - job just cleans up all expired states
}

/**
 * Processor for handling OAuth state cleanup jobs
 * Deletes expired OAuth states to prevent database bloat
 */
@Processor('oauth-state-cleanup')
@Injectable()
export class OAuthStateCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(OAuthStateCleanupProcessor.name);

  constructor(private oauthStateService: OAuthStateService) {
    super();
  }

  /**
   * Processes an OAuth state cleanup job
   * Deletes all expired OAuth states from the database
   *
   * @param job - The cleanup job
   */
  async process(job: Job<OAuthStateCleanupJobData>): Promise<void> {
    // Handle oauth-state-cleanup job type
    if (job.name !== 'oauth-state-cleanup') {
      throw new Error(`Unknown job type: ${job.name}`);
    }

    this.logger.log(`Processing OAuth state cleanup job ${job.id}`);

    try {
      const deletedCount = await this.oauthStateService.cleanupExpiredStates();

      this.logger.log(
        `Completed OAuth state cleanup job ${job.id}. Deleted ${deletedCount} expired states.`
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to process OAuth state cleanup job ${job.id}: ${error.message}`,
        error.stack
      );

      // Check if this is the final attempt (after all retries)
      const maxAttempts = job.opts.attempts || 1;
      const isFinalAttempt = job.attemptsMade >= maxAttempts;

      if (isFinalAttempt) {
        this.logger.error(
          `OAuth state cleanup job ${job.id} failed after all retries. Manual intervention may be required.`
        );
      }

      // Re-throw error so BullMQ can handle retries
      throw error;
    }
  }
}
