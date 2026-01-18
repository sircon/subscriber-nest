import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Job } from 'bullmq';
import {
  User,
  BillingSubscription,
  BillingUsage,
  EspConnection,
  Subscriber,
  SyncHistory,
  Session,
} from '@subscriber-nest/shared/entities';
import { StripeService } from '../services/stripe.service';
import { BillingSubscriptionService } from '../services/billing-subscription.service';

export interface AccountDeletionJobData {
  // Optional: can be provided for manual runs
  userId?: string;
}

/**
 * Processor for handling account deletion jobs
 * Deletes users and all associated data after 30-day grace period
 */
@Processor('account-deletion')
@Injectable()
export class AccountDeletionProcessor extends WorkerHost {
  private readonly logger = new Logger(AccountDeletionProcessor.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(BillingSubscription)
    private billingSubscriptionRepository: Repository<BillingSubscription>,
    @InjectRepository(BillingUsage)
    private billingUsageRepository: Repository<BillingUsage>,
    @InjectRepository(EspConnection)
    private espConnectionRepository: Repository<EspConnection>,
    @InjectRepository(Subscriber)
    private subscriberRepository: Repository<Subscriber>,
    @InjectRepository(SyncHistory)
    private syncHistoryRepository: Repository<SyncHistory>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private stripeService: StripeService,
    private billingSubscriptionService: BillingSubscriptionService
  ) {
    super();
  }

  /**
   * Processes an account deletion job
   * - Finds users with deleteRequestedAt older than 30 days
   * - For each user, hard deletes all associated data
   * - Cancels Stripe subscription if still active
   * - Deletes user record
   *
   * @param job - The job (can contain userId for manual runs, or empty to process all eligible users)
   */
  async process(job: Job<AccountDeletionJobData>): Promise<void> {
    // Handle account-deletion job type
    if (job.name !== 'account-deletion') {
      throw new Error(`Unknown job type: ${job.name}`);
    }

    this.logger.log(`Processing account deletion job ${job.id}`);

    try {
      let usersToDelete: User[];

      if (job.data.userId) {
        // Manual run for specific user
        const user = await this.userRepository.findOne({
          where: { id: job.data.userId },
        });

        if (!user || !user.deleteRequestedAt) {
          this.logger.warn(
            `User ${job.data.userId} not found or deletion not requested`
          );
          return;
        }

        // Check if 30 days have passed
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        if (user.deleteRequestedAt > thirtyDaysAgo) {
          this.logger.warn(
            `User ${job.data.userId} deletion requested less than 30 days ago. Skipping.`
          );
          return;
        }

        usersToDelete = [user];
      } else {
        // Find all users with deleteRequestedAt older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        usersToDelete = await this.userRepository.find({
          where: {
            deleteRequestedAt: LessThan(thirtyDaysAgo),
          },
        });
      }

      this.logger.log(`Found ${usersToDelete.length} users to delete`);

      // Process each user's deletion
      for (const user of usersToDelete) {
        try {
          await this.deleteUserData(user);
        } catch (error: any) {
          // Log error but continue processing other users
          this.logger.error(
            `Failed to delete user ${user.id}: ${error.message}`,
            error.stack
          );
          // Continue with next user instead of failing entire job
        }
      }

      this.logger.log(`Completed account deletion job ${job.id}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to process account deletion job ${job.id}: ${error.message}`,
        error.stack
      );

      // Check if this is the final attempt (after all retries)
      const maxAttempts = job.opts.attempts || 1;
      const isFinalAttempt = job.attemptsMade >= maxAttempts;

      if (isFinalAttempt) {
        this.logger.error(
          `Account deletion job ${job.id} failed after all retries. Manual intervention may be required.`
        );
      }

      // Re-throw error so BullMQ can handle retries
      throw error;
    }
  }

  /**
   * Delete all data associated with a user
   * @param user - The user to delete
   */
  private async deleteUserData(user: User): Promise<void> {
    const userId = user.id;

    this.logger.log(`Deleting all data for user ${userId}`);

    // 1. Cancel Stripe subscription if still active
    const subscription =
      await this.billingSubscriptionService.findByUserId(userId);
    if (subscription && subscription.stripeSubscriptionId) {
      try {
        // Check if subscription is still active in Stripe
        const stripeSubscription = await this.stripeService.getSubscription(
          subscription.stripeSubscriptionId
        );
        if (
          stripeSubscription.status === 'active' ||
          stripeSubscription.status === 'trialing'
        ) {
          await this.stripeService.cancelSubscription(
            subscription.stripeSubscriptionId,
            false
          );
          this.logger.log(`Canceled Stripe subscription for user ${userId}`);
        }
      } catch (error: any) {
        // Log error but continue with deletion
        this.logger.warn(
          `Failed to cancel Stripe subscription for user ${userId}: ${error.message}`
        );
      }
    }

    // 2. Get all ESP connections for the user
    const espConnections = await this.espConnectionRepository.find({
      where: { userId },
      select: ['id'],
    });

    const connectionIds = espConnections.map((conn) => conn.id);

    // 3. Delete subscribers (through ESP connections)
    if (connectionIds.length > 0) {
      await this.subscriberRepository.delete({
        espConnectionId: In(connectionIds),
      });
      this.logger.log(`Deleted subscribers for user ${userId}`);
    }

    // 4. Delete sync history (through ESP connections)
    if (connectionIds.length > 0) {
      await this.syncHistoryRepository.delete({
        espConnectionId: In(connectionIds),
      });
      this.logger.log(`Deleted sync history for user ${userId}`);
    }

    // 5. Delete ESP connections
    await this.espConnectionRepository.delete({ userId });
    this.logger.log(`Deleted ESP connections for user ${userId}`);

    // 6. Delete billing usage records
    await this.billingUsageRepository.delete({ userId });
    this.logger.log(`Deleted billing usage records for user ${userId}`);

    // 7. Delete billing subscription
    await this.billingSubscriptionRepository.delete({ userId });
    this.logger.log(`Deleted billing subscription for user ${userId}`);

    // 8. Delete sessions
    await this.sessionRepository.delete({ userId });
    this.logger.log(`Deleted sessions for user ${userId}`);

    // 9. Hard delete user (set deletedAt and then remove)
    await this.userRepository.update(userId, {
      deletedAt: new Date(),
    });
    await this.userRepository.remove(user);

    this.logger.log(
      `Successfully deleted user ${userId} and all associated data`
    );
  }
}
