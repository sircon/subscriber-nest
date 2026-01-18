import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import {
  BillingSubscription,
  BillingSubscriptionStatus,
} from '../entities/billing-subscription.entity';
import { Subscriber } from '../entities/subscriber.entity';
import { EspConnection } from '../entities/esp-connection.entity';
import { BillingUsageService } from '../services/billing-usage.service';

export interface MonthlyBillingJobData {
  // Optional: can be provided for manual runs, otherwise current month is used
  billingPeriodStart?: Date;
  billingPeriodEnd?: Date;
}

/**
 * Processor for handling monthly billing jobs
 */
@Processor('billing')
@Injectable()
export class BillingProcessor extends WorkerHost {
  private readonly logger = new Logger(BillingProcessor.name);

  constructor(
    @InjectRepository(BillingSubscription)
    private billingSubscriptionRepository: Repository<BillingSubscription>,
    @InjectRepository(Subscriber)
    private subscriberRepository: Repository<Subscriber>,
    @InjectRepository(EspConnection)
    private espConnectionRepository: Repository<EspConnection>,
    private billingUsageService: BillingUsageService
  ) {
    super();
  }

  /**
   * Processes a monthly billing job
   * - Finds all users with active subscriptions
   * - For each user, creates new BillingUsage record for current month
   * - Note: Stripe handles invoicing automatically for metered billing based on usage records
   * - This job only tracks usage records for historical purposes
   *
   * @param job - The job (billing period dates are calculated dynamically)
   */
  async process(job: Job<MonthlyBillingJobData>): Promise<void> {
    // Handle monthly-billing job type
    if (job.name !== 'monthly-billing') {
      throw new Error(`Unknown job type: ${job.name}`);
    }

    this.logger.log(
      `Processing monthly billing job ${job.id} for current month`
    );

    try {
      // Find all users with active subscriptions
      const activeSubscriptions = await this.billingSubscriptionRepository.find(
        {
          where: {
            status: BillingSubscriptionStatus.ACTIVE,
          },
          relations: ['user'],
        }
      );

      this.logger.log(
        `Found ${activeSubscriptions.length} active subscriptions to process`
      );

      // Process each user's billing usage tracking
      for (const subscription of activeSubscriptions) {
        try {
          await this.processUserBillingUsage(subscription);
        } catch (error: any) {
          // Log error but continue processing other users
          this.logger.error(
            `Failed to process billing usage for user ${subscription.userId}: ${error.message}`,
            error.stack
          );
          // Continue with next user instead of failing entire job
        }
      }

      this.logger.log(`Completed monthly billing job ${job.id}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to process monthly billing job ${job.id}: ${error.message}`,
        error.stack
      );

      // Check if this is the final attempt (after all retries)
      const maxAttempts = job.opts.attempts || 1;
      const isFinalAttempt = job.attemptsMade >= maxAttempts;

      if (isFinalAttempt) {
        this.logger.error(
          `Monthly billing job ${job.id} failed after all retries. Manual intervention may be required.`
        );
      }

      // Re-throw error so BullMQ can handle retries
      throw error;
    }
  }

  /**
   * Process billing usage tracking for a single user
   * Creates new BillingUsage record for current month for historical tracking
   * Note: Stripe handles invoicing automatically for metered billing
   * @param subscription - The user's billing subscription
   */
  private async processUserBillingUsage(
    subscription: BillingSubscription
  ): Promise<void> {
    const userId = subscription.userId;

    this.logger.log(`Processing billing usage tracking for user ${userId}`);

    // Get current subscriber count for the user across all ESP connections
    const userConnections = await this.espConnectionRepository.find({
      where: { userId },
      select: ['id'],
    });

    const connectionIds = userConnections.map((conn) => conn.id);
    let currentSubscriberCount = 0;

    if (connectionIds.length > 0) {
      currentSubscriberCount = await this.subscriberRepository.count({
        where: connectionIds.map((id) => ({ espConnectionId: id })),
      });
    }

    // Use BillingUsageService to create/update current month's usage
    // This tracks usage for historical purposes
    // Stripe automatically handles invoicing based on usage records reported via meter
    await this.billingUsageService.updateUsage(userId, currentSubscriberCount);

    this.logger.log(
      `Created/updated billing usage record for user ${userId} for current month with ${currentSubscriberCount} subscribers`
    );
  }
}
