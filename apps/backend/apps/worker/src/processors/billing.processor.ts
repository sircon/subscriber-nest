import { BillingUsageService } from '@app/core/billing/billing-usage.service';
import { BillingSubscription, BillingSubscriptionStatus } from '@app/database/entities/billing-subscription.entity';
import { EspConnection } from '@app/database/entities/esp-connection.entity';
import { Subscriber } from '@app/database/entities/subscriber.entity';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';


export interface MonthlyBillingJobData {
  billingPeriodStart?: Date;
  billingPeriodEnd?: Date;
}

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

  async process(job: Job<MonthlyBillingJobData>): Promise<void> {
    if (job.name !== 'monthly-billing') {
      throw new Error(`Unknown job type: ${job.name}`);
    }

    this.logger.log(
      `Processing monthly billing job ${job.id} for current month`
    );

    try {
      const activeSubscriptions = await this.billingSubscriptionRepository.find(
        {
          where: { status: BillingSubscriptionStatus.ACTIVE },
          relations: ['user'],
        }
      );

      this.logger.log(
        `Found ${activeSubscriptions.length} active subscriptions to process`
      );

      for (const subscription of activeSubscriptions) {
        try {
          await this.processUserBillingUsage(subscription);
        } catch (error: any) {
          this.logger.error(
            `Failed to process billing usage for user ${subscription.userId}: ${error.message}`,
            error.stack
          );
        }
      }

      this.logger.log(`Completed monthly billing job ${job.id}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to process monthly billing job ${job.id}: ${error.message}`,
        error.stack
      );

      const maxAttempts = job.opts.attempts || 1;
      const isFinalAttempt = job.attemptsMade >= maxAttempts;

      if (isFinalAttempt) {
        this.logger.error(
          `Monthly billing job ${job.id} failed after all retries. Manual intervention may be required.`
        );
      }

      throw error;
    }
  }

  private async processUserBillingUsage(
    subscription: BillingSubscription
  ): Promise<void> {
    const userId = subscription.userId;

    this.logger.log(`Processing billing usage tracking for user ${userId}`);

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

    await this.billingUsageService.updateUsage(userId, currentSubscriberCount);

    this.logger.log(
      `Created/updated billing usage record for user ${userId} for current month with ${currentSubscriberCount} subscribers`
    );
  }
}
