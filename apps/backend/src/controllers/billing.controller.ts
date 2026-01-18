import {
  Controller,
  Post,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import Stripe from 'stripe';
import { StripeService } from '../services/stripe.service';
import { BillingSubscriptionService } from '../services/billing-subscription.service';
import { BillingUsageService } from '../services/billing-usage.service';
import { BillingUsageStatus } from '../entities/billing-usage.entity';
import {
  BillingSubscription,
  BillingSubscriptionStatus,
} from '../entities/billing-subscription.entity';
import { AuthGuard } from '../guards/auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { EspConnection } from '../entities/esp-connection.entity';
import { Subscriber } from '../entities/subscriber.entity';

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly billingSubscriptionService: BillingSubscriptionService,
    private readonly billingUsageService: BillingUsageService,
    private readonly configService: ConfigService,
    @InjectRepository(EspConnection)
    private readonly espConnectionRepository: Repository<EspConnection>,
    @InjectRepository(Subscriber)
    private readonly subscriberRepository: Repository<Subscriber>,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    try {
      // Verify webhook signature
      const webhookSecret = this.stripeService.getWebhookSecret();
      if (!webhookSecret) {
        this.logger.error('STRIPE_WEBHOOK_SECRET is not configured');
        throw new InternalServerErrorException('Webhook secret not configured');
      }

      // Get raw body for signature verification
      const rawBody = req.body as Buffer;
      if (!rawBody) {
        this.logger.error('Raw body is required for webhook signature verification');
        throw new BadRequestException('Raw body is required');
      }

      // Verify webhook signature
      let event: Stripe.Event;
      try {
        event = this.stripeService.getClient().webhooks.constructEvent(
          rawBody,
          signature,
          webhookSecret,
        );
      } catch (error: any) {
        this.logger.error(`Webhook signature verification failed: ${error.message}`);
        throw new BadRequestException(`Webhook signature verification failed: ${error.message}`);
      }

      // Handle the event
      this.logger.log(`Received webhook event: ${event.type}`);

      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error: any) {
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);

      // Re-throw known exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // Wrap unknown errors
      throw new InternalServerErrorException(`Failed to process webhook: ${error.message}`);
    }
  }

  /**
   * Handle customer.subscription.created event
   */
  private async handleSubscriptionCreated(stripeSubscription: Stripe.Subscription): Promise<void> {
    try {
      this.logger.log(`Processing subscription.created for subscription: ${stripeSubscription.id}`);

      // Get customer ID and find user
      const customerId = stripeSubscription.customer as string;
      const existingSubscription = await this.billingSubscriptionService.findByStripeCustomerId(
        customerId,
      );

      if (existingSubscription) {
        // Update existing subscription
        await this.billingSubscriptionService.syncFromStripe(
          stripeSubscription,
          existingSubscription.userId,
        );
        this.logger.log(`Updated subscription for user: ${existingSubscription.userId}`);
      } else {
        // Try to get userId from customer metadata
        const customer = await this.stripeService.getClient().customers.retrieve(customerId);
        if (customer.deleted) {
          this.logger.warn(`Customer ${customerId} is deleted, cannot create subscription`);
          return;
        }

        const userId = (customer as Stripe.Customer).metadata?.userId;
        if (!userId) {
          this.logger.warn(
            `Customer ${customerId} does not have userId in metadata, cannot create subscription`,
          );
          return;
        }

        await this.billingSubscriptionService.syncFromStripe(stripeSubscription, userId);
        this.logger.log(`Created subscription for user: ${userId}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Error handling subscription.created: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle customer.subscription.updated event
   */
  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    try {
      this.logger.log(`Processing subscription.updated for subscription: ${stripeSubscription.id}`);

      // Find existing subscription
      const existingSubscription = await this.billingSubscriptionService.findByStripeSubscriptionId(
        stripeSubscription.id,
      );

      if (existingSubscription) {
        // Update existing subscription
        await this.billingSubscriptionService.syncFromStripe(
          stripeSubscription,
          existingSubscription.userId,
        );
        this.logger.log(`Updated subscription for user: ${existingSubscription.userId}`);
      } else {
        // Try to find by customer ID
        const customerId = stripeSubscription.customer as string;
        const subscriptionByCustomer = await this.billingSubscriptionService.findByStripeCustomerId(
          customerId,
        );

        if (subscriptionByCustomer) {
          await this.billingSubscriptionService.syncFromStripe(
            stripeSubscription,
            subscriptionByCustomer.userId,
          );
          this.logger.log(`Updated subscription for user: ${subscriptionByCustomer.userId}`);
        } else {
          // Try to get userId from customer metadata
          const customer = await this.stripeService.getClient().customers.retrieve(customerId);
          if (customer.deleted) {
            this.logger.warn(`Customer ${customerId} is deleted, cannot update subscription`);
            return;
          }

          const userId = (customer as Stripe.Customer).metadata?.userId;
          if (!userId) {
            this.logger.warn(
              `Customer ${customerId} does not have userId in metadata, cannot update subscription`,
            );
            return;
          }

          await this.billingSubscriptionService.syncFromStripe(stripeSubscription, userId);
          this.logger.log(`Created subscription for user: ${userId}`);
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Error handling subscription.updated: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle customer.subscription.deleted event
   */
  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    try {
      this.logger.log(`Processing subscription.deleted for subscription: ${stripeSubscription.id}`);

      // Find existing subscription
      const existingSubscription = await this.billingSubscriptionService.findByStripeSubscriptionId(
        stripeSubscription.id,
      );

      if (existingSubscription) {
        // Update subscription status to canceled
        await this.billingSubscriptionService.update(existingSubscription.id, {
          status: 'canceled' as any,
          canceledAt: new Date(),
          cancelAtPeriodEnd: false,
        });
        this.logger.log(`Marked subscription as canceled for user: ${existingSubscription.userId}`);
      } else {
        this.logger.warn(
          `Subscription ${stripeSubscription.id} not found in database, cannot mark as deleted`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Error handling subscription.deleted: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle invoice.paid event
   */
  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    try {
      this.logger.log(`Processing invoice.paid for invoice: ${invoice.id}`);

      // Update billing usage record if it exists
      if (invoice.id) {
        const billingUsage = await this.billingUsageService.updateStatusByInvoiceId(
          invoice.id,
          BillingUsageStatus.PAID,
        );

        if (billingUsage) {
          this.logger.log(`Updated billing usage status to PAID for invoice: ${invoice.id}`);
        } else {
          this.logger.warn(`Billing usage record not found for invoice: ${invoice.id}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`Error handling invoice.paid: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handle invoice.payment_failed event
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      this.logger.log(`Processing invoice.payment_failed for invoice: ${invoice.id}`);

      // Update billing usage record if it exists
      if (invoice.id) {
        const billingUsage = await this.billingUsageService.updateStatusByInvoiceId(
          invoice.id,
          BillingUsageStatus.FAILED,
        );

        if (billingUsage) {
          this.logger.log(`Updated billing usage status to FAILED for invoice: ${invoice.id}`);
        } else {
          this.logger.warn(`Billing usage record not found for invoice: ${invoice.id}`);
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Error handling invoice.payment_failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Create a Stripe Checkout session for subscription
   * POST /billing/create-checkout-session
   */
  @Post('create-checkout-session')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async createCheckoutSession(@CurrentUser() user: User): Promise<{ url: string }> {
    try {
      this.logger.log(`Creating checkout session for user: ${user.id}`);

      // Get frontend URL from environment
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

      // Build success and cancel URLs
      const successUrl = `${frontendUrl}/dashboard/settings?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${frontendUrl}/onboarding/stripe?canceled=true`;

      // Check if user already has a Stripe customer
      let existingSubscription = await this.billingSubscriptionService.findByUserId(user.id);
      let customerId: string;

      if (existingSubscription && existingSubscription.stripeCustomerId) {
        // Use existing customer
        customerId = existingSubscription.stripeCustomerId;
        this.logger.log(`Using existing Stripe customer: ${customerId}`);
      } else {
        // Create new Stripe customer
        this.logger.log(`Creating new Stripe customer for user: ${user.id}`);
        const customer = await this.stripeService.createCustomer(user.email, user.id);
        customerId = customer.id;

        // Create or update billing subscription record with customer ID
        if (existingSubscription) {
          await this.billingSubscriptionService.update(existingSubscription.id, {
            stripeCustomerId: customerId,
          });
        } else {
          await this.billingSubscriptionService.create({
            userId: user.id,
            stripeCustomerId: customerId,
            status: BillingSubscriptionStatus.INCOMPLETE,
          });
        }
      }

      // Create checkout session
      const session = await this.stripeService.createCheckoutSession(
        customerId,
        user.email,
        successUrl,
        cancelUrl,
      );

      this.logger.log(`Created checkout session: ${session.id} for user: ${user.id}`);

      return { url: session.url || '' };
    } catch (error: any) {
      this.logger.error(
        `Error creating checkout session for user ${user.id}: ${error.message}`,
        error.stack,
      );

      // Re-throw known exceptions
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      // Wrap unknown errors
      throw new InternalServerErrorException(
        `Failed to create checkout session: ${error.message}`,
      );
    }
  }

  /**
   * Create a Stripe Customer Portal session
   * POST /billing/create-portal-session
   */
  @Post('create-portal-session')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async createPortalSession(@CurrentUser() user: User): Promise<{ url: string }> {
    try {
      this.logger.log(`Creating portal session for user: ${user.id}`);

      // Get frontend URL from environment
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

      // Build return URL
      const returnUrl = `${frontendUrl}/dashboard/settings`;

      // Check if user has a Stripe customer
      const existingSubscription = await this.billingSubscriptionService.findByUserId(user.id);

      if (!existingSubscription || !existingSubscription.stripeCustomerId) {
        throw new BadRequestException('User does not have an active Stripe customer');
      }

      // Create portal session
      const session = await this.stripeService.createPortalSession(
        existingSubscription.stripeCustomerId,
        returnUrl,
      );

      this.logger.log(`Created portal session: ${session.id} for user: ${user.id}`);

      return { url: session.url || '' };
    } catch (error: any) {
      this.logger.error(
        `Error creating portal session for user ${user.id}: ${error.message}`,
        error.stack,
      );

      // Re-throw known exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // Wrap unknown errors
      throw new InternalServerErrorException(
        `Failed to create portal session: ${error.message}`,
      );
    }
  }

  /**
   * Get billing status for the authenticated user
   * GET /billing/status
   */
  @Get('status')
  @UseGuards(AuthGuard)
  async getBillingStatus(
    @CurrentUser() user: User,
  ): Promise<{
    hasActiveSubscription: boolean;
    subscription: BillingSubscription | null;
    currentPeriodEnd: Date | null;
  }> {
    try {
      // Find subscription for user
      const subscription = await this.billingSubscriptionService.findByUserId(user.id);

      if (!subscription) {
        return {
          hasActiveSubscription: false,
          subscription: null,
          currentPeriodEnd: null,
        };
      }

      // Check if subscription is active
      // Active means: status is 'active' and not canceled at period end
      const hasActiveSubscription =
        subscription.status === BillingSubscriptionStatus.ACTIVE &&
        !subscription.cancelAtPeriodEnd;

      return {
        hasActiveSubscription,
        subscription,
        currentPeriodEnd: subscription.currentPeriodEnd,
      };
    } catch (error: any) {
      this.logger.error(
        `Error getting billing status for user ${user.id}: ${error.message}`,
        error.stack,
      );

      // Wrap unknown errors
      throw new InternalServerErrorException(
        `Failed to get billing status: ${error.message}`,
      );
    }
  }

  /**
   * Get current month's usage for the authenticated user
   * GET /billing/usage
   */
  @Get('usage')
  @UseGuards(AuthGuard)
  async getCurrentUsage(
    @CurrentUser() user: User,
  ): Promise<{
    maxSubscriberCount: number;
    calculatedAmount: number;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
  }> {
    try {
      // Get current month's billing usage
      let billingUsage = await this.billingUsageService.getCurrentUsage(user.id);

      // If no usage record exists for current month, create one with current subscriber count
      if (!billingUsage) {
        // Get all ESP connection IDs for the user
        const userConnections = await this.espConnectionRepository.find({
          where: { userId: user.id },
          select: ['id'],
        });

        const connectionIds = userConnections.map((conn) => conn.id);

        // Count all subscribers across all user's ESP connections
        let currentSubscriberCount = 0;
        if (connectionIds.length > 0) {
          currentSubscriberCount = await this.subscriberRepository.count({
            where: {
              espConnectionId: In(connectionIds),
            },
          });
        }

        // Create usage record using updateUsage method (which handles creation)
        await this.billingUsageService.updateUsage(user.id, currentSubscriberCount);

        // Fetch the newly created record
        billingUsage = await this.billingUsageService.getCurrentUsage(user.id);
      }

      if (!billingUsage) {
        throw new InternalServerErrorException('Failed to create or retrieve billing usage');
      }

      return {
        maxSubscriberCount: billingUsage.maxSubscriberCount,
        calculatedAmount: Number(billingUsage.calculatedAmount),
        billingPeriodStart: billingUsage.billingPeriodStart,
        billingPeriodEnd: billingUsage.billingPeriodEnd,
      };
    } catch (error: any) {
      this.logger.error(
        `Error getting current usage for user ${user.id}: ${error.message}`,
        error.stack,
      );

      // Re-throw known exceptions
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      // Wrap unknown errors
      throw new InternalServerErrorException(
        `Failed to get current usage: ${error.message}`,
      );
    }
  }

  /**
   * Get billing history for the authenticated user
   * GET /billing/history
   */
  @Get('history')
  @UseGuards(AuthGuard)
  async getBillingHistory(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
  ): Promise<
    Array<{
      billingPeriodStart: Date;
      billingPeriodEnd: Date;
      maxSubscriberCount: number;
      calculatedAmount: number;
      status: BillingUsageStatus;
      stripeInvoiceId: string | null;
    }>
  > {
    try {
      // Parse limit query parameter (default: 12)
      const limitNumber = limit ? parseInt(limit, 10) : 12;

      // Validate limit is a positive number
      if (isNaN(limitNumber) || limitNumber < 1) {
        throw new BadRequestException('Limit must be a positive number');
      }

      // Get billing history from service
      const billingHistory = await this.billingUsageService.getBillingHistory(
        user.id,
        limitNumber,
      );

      // Map to response format
      return billingHistory.map((usage) => ({
        billingPeriodStart: usage.billingPeriodStart,
        billingPeriodEnd: usage.billingPeriodEnd,
        maxSubscriberCount: usage.maxSubscriberCount,
        calculatedAmount: Number(usage.calculatedAmount),
        status: usage.status,
        stripeInvoiceId: usage.stripeInvoiceId,
      }));
    } catch (error: any) {
      this.logger.error(
        `Error getting billing history for user ${user.id}: ${error.message}`,
        error.stack,
      );

      // Re-throw known exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // Wrap unknown errors
      throw new InternalServerErrorException(
        `Failed to get billing history: ${error.message}`,
      );
    }
  }
}
