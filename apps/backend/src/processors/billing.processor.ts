import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { User } from '../entities/user.entity';
import { BillingSubscription, BillingSubscriptionStatus } from '../entities/billing-subscription.entity';
import { BillingUsage, BillingUsageStatus } from '../entities/billing-usage.entity';
import { Subscriber } from '../entities/subscriber.entity';
import { EspConnection } from '../entities/esp-connection.entity';
import { StripeService } from '../services/stripe.service';
import { BillingUsageService } from '../services/billing-usage.service';

export interface MonthlyBillingJobData {
  // Optional: can be provided for manual runs, otherwise calculated from current date
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
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(BillingSubscription)
    private billingSubscriptionRepository: Repository<BillingSubscription>,
    @InjectRepository(BillingUsage)
    private billingUsageRepository: Repository<BillingUsage>,
    @InjectRepository(Subscriber)
    private subscriberRepository: Repository<Subscriber>,
    @InjectRepository(EspConnection)
    private espConnectionRepository: Repository<EspConnection>,
    private stripeService: StripeService,
    private billingUsageService: BillingUsageService,
  ) {
    super();
  }

  /**
   * Processes a monthly billing job
   * - Finds all users with active subscriptions
   * - For each user, retrieves BillingUsage for previous month
   * - Creates Stripe invoice item with calculated amount
   * - Finalizes Stripe invoice and charges customer
   * - Updates BillingUsage record with stripeInvoiceId and status: 'invoiced'
   * - Creates new BillingUsage record for current month
   *
   * @param job - The job containing billing period dates
   */
  async process(job: Job<MonthlyBillingJobData>): Promise<void> {
    // Handle monthly-billing job type
    if (job.name !== 'monthly-billing') {
      throw new Error(`Unknown job type: ${job.name}`);
    }

    // Calculate billing period for previous month (the month we're billing for)
    // If provided in job data, use those; otherwise calculate from current date
    let billingPeriodStart: Date;
    let billingPeriodEnd: Date;

    if (job.data.billingPeriodStart && job.data.billingPeriodEnd) {
      billingPeriodStart = new Date(job.data.billingPeriodStart);
      billingPeriodEnd = new Date(job.data.billingPeriodEnd);
    } else {
      // Calculate previous month's billing period
      const now = new Date();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = previousMonth.getFullYear();
      const month = previousMonth.getMonth();

      // First day of previous month at 00:00:00
      billingPeriodStart = new Date(year, month, 1, 0, 0, 0, 0);

      // Last day of previous month at 23:59:59.999
      billingPeriodEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    }

    this.logger.log(
      `Processing monthly billing job ${job.id} for period ${billingPeriodStart.toISOString()} to ${billingPeriodEnd.toISOString()}`,
    );

    try {
      // Find all users with active subscriptions
      const activeSubscriptions = await this.billingSubscriptionRepository.find({
        where: {
          status: BillingSubscriptionStatus.ACTIVE,
        },
        relations: ['user'],
      });

      this.logger.log(`Found ${activeSubscriptions.length} active subscriptions to process`);

      // Process each user's billing
      for (const subscription of activeSubscriptions) {
        try {
          await this.processUserBilling(subscription, billingPeriodStart, billingPeriodEnd);
        } catch (error: any) {
          // Log error but continue processing other users
          this.logger.error(
            `Failed to process billing for user ${subscription.userId}: ${error.message}`,
            error.stack,
          );
          // Continue with next user instead of failing entire job
        }
      }

      this.logger.log(`Completed monthly billing job ${job.id}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to process monthly billing job ${job.id}: ${error.message}`,
        error.stack,
      );

      // Check if this is the final attempt (after all retries)
      const maxAttempts = job.opts.attempts || 1;
      const isFinalAttempt = job.attemptsMade >= maxAttempts;

      if (isFinalAttempt) {
        this.logger.error(
          `Monthly billing job ${job.id} failed after all retries. Manual intervention may be required.`,
        );
      }

      // Re-throw error so BullMQ can handle retries
      throw error;
    }
  }

  /**
   * Process billing for a single user
   * @param subscription - The user's billing subscription
   * @param billingPeriodStart - Start date of the billing period
   * @param billingPeriodEnd - End date of the billing period
   */
  private async processUserBilling(
    subscription: BillingSubscription,
    billingPeriodStart: Date,
    billingPeriodEnd: Date,
  ): Promise<void> {
    const userId = subscription.userId;
    const customerId = subscription.stripeCustomerId;

    this.logger.log(`Processing billing for user ${userId}`);

    // Retrieve BillingUsage for previous month
    const previousMonthUsage = await this.billingUsageRepository.findOne({
      where: {
        userId,
        billingPeriodStart,
      },
    });

    if (!previousMonthUsage) {
      this.logger.warn(
        `No billing usage record found for user ${userId} for period ${billingPeriodStart.toISOString()}. Skipping.`,
      );
      return;
    }

    // Skip if already invoiced
    if (previousMonthUsage.status === BillingUsageStatus.INVOICED) {
      this.logger.log(
        `Billing usage for user ${userId} already invoiced. Skipping.`,
      );
      return;
    }

    // Create Stripe invoice item with calculated amount
    const description = `Subscriber billing for ${billingPeriodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (${previousMonthUsage.maxSubscriberCount} subscribers)`;
    
    try {
      await this.stripeService.createInvoiceItem(
        customerId,
        previousMonthUsage.calculatedAmount,
        description,
      );

      // Finalize Stripe invoice and charge customer
      const invoice = await this.stripeService.createAndFinalizeInvoice(customerId);

      // Update BillingUsage record with stripeInvoiceId and status: 'invoiced'
      await this.billingUsageRepository.update(
        { id: previousMonthUsage.id },
        {
          stripeInvoiceId: invoice.id,
          status: BillingUsageStatus.INVOICED,
        },
      );

      this.logger.log(
        `Successfully invoiced user ${userId} for period ${billingPeriodStart.toISOString()}. Invoice: ${invoice.id}`,
      );
    } catch (error: any) {
      // Update status to 'failed' if invoice creation fails
      await this.billingUsageRepository.update(
        { id: previousMonthUsage.id },
        {
          status: BillingUsageStatus.FAILED,
        },
      );
      throw error;
    }

    // Create new BillingUsage record for current month
    // Get current subscriber count for the user
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
    await this.billingUsageService.updateUsage(userId, currentSubscriberCount);

    this.logger.log(
      `Created new billing usage record for user ${userId} for current month with ${currentSubscriberCount} subscribers`,
    );
  }
}
