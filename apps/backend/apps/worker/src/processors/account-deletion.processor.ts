import { BillingSubscriptionService } from '@app/core/billing/billing-subscription.service';
import { StripeService } from '@app/core/billing/stripe.service';
import { BillingSubscription } from '@app/database/entities/billing-subscription.entity';
import { BillingUsage } from '@app/database/entities/billing-usage.entity';
import { EspConnection } from '@app/database/entities/esp-connection.entity';
import { Session as SessionEntity } from '@app/database/entities/session.entity';
import { Subscriber } from '@app/database/entities/subscriber.entity';
import { SyncHistory } from '@app/database/entities/sync-history.entity';
import { User } from '@app/database/entities/user.entity';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { In, LessThan, Repository } from 'typeorm';


export interface AccountDeletionJobData {
  userId?: string;
}

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
    @InjectRepository(SessionEntity)
    private sessionRepository: Repository<SessionEntity>,
    private stripeService: StripeService,
    private billingSubscriptionService: BillingSubscriptionService
  ) {
    super();
  }

  async process(job: Job<AccountDeletionJobData>): Promise<void> {
    if (job.name !== 'account-deletion') {
      throw new Error(`Unknown job type: ${job.name}`);
    }

    this.logger.log(`Processing account deletion job ${job.id}`);

    try {
      let usersToDelete: User[];

      if (job.data.userId) {
        const user = await this.userRepository.findOne({
          where: { id: job.data.userId },
        });

        if (!user || !user.deleteRequestedAt) {
          this.logger.warn(
            `User ${job.data.userId} not found or deletion not requested`
          );
          return;
        }

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
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        usersToDelete = await this.userRepository.find({
          where: { deleteRequestedAt: LessThan(thirtyDaysAgo) },
        });
      }

      this.logger.log(`Found ${usersToDelete.length} users to delete`);

      for (const user of usersToDelete) {
        try {
          await this.deleteUserData(user);
        } catch (error: any) {
          this.logger.error(
            `Failed to delete user ${user.id}: ${error.message}`,
            error.stack
          );
        }
      }

      this.logger.log(`Completed account deletion job ${job.id}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to process account deletion job ${job.id}: ${error.message}`,
        error.stack
      );

      const maxAttempts = job.opts.attempts || 1;
      const isFinalAttempt = job.attemptsMade >= maxAttempts;

      if (isFinalAttempt) {
        this.logger.error(
          `Account deletion job ${job.id} failed after all retries. Manual intervention may be required.`
        );
      }

      throw error;
    }
  }

  private async deleteUserData(user: User): Promise<void> {
    const userId = user.id;

    this.logger.log(`Deleting all data for user ${userId}`);

    const subscription =
      await this.billingSubscriptionService.findByUserId(userId);
    if (subscription?.stripeSubscriptionId) {
      try {
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
        this.logger.warn(
          `Failed to cancel Stripe subscription for user ${userId}: ${error.message}`
        );
      }
    }

    const espConnections = await this.espConnectionRepository.find({
      where: { userId },
      select: ['id'],
    });

    const connectionIds = espConnections.map((conn) => conn.id);

    if (connectionIds.length > 0) {
      await this.subscriberRepository.delete({
        espConnectionId: In(connectionIds),
      });
      this.logger.log(`Deleted subscribers for user ${userId}`);

      await this.syncHistoryRepository.delete({
        espConnectionId: In(connectionIds),
      });
      this.logger.log(`Deleted sync history for user ${userId}`);
    }

    await this.espConnectionRepository.delete({ userId });
    this.logger.log(`Deleted ESP connections for user ${userId}`);

    await this.billingUsageRepository.delete({ userId });
    this.logger.log(`Deleted billing usage records for user ${userId}`);

    await this.billingSubscriptionRepository.delete({ userId });
    this.logger.log(`Deleted billing subscription for user ${userId}`);

    await this.sessionRepository.delete({ userId });
    this.logger.log(`Deleted sessions for user ${userId}`);

    await this.userRepository.update(userId, {
      deletedAt: new Date(),
    });
    await this.userRepository.remove(user);

    this.logger.log(
      `Successfully deleted user ${userId} and all associated data`
    );
  }
}
