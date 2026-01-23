import { BillingSubscriptionService } from '@app/core/billing/billing-subscription.service';
import { BillingUsageService } from '@app/core/billing/billing-usage.service';
import { StripeService } from '@app/core/billing/stripe.service';
import { BillingSubscription, BillingSubscriptionStatus } from '@app/database/entities/billing-subscription.entity';
import { BillingUsageStatus } from '@app/database/entities/billing-usage.entity';
import { EspConnection } from '@app/database/entities/esp-connection.entity';
import { Subscriber } from '@app/database/entities/subscriber.entity';
import { User } from '@app/database/entities/user.entity';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import Stripe from 'stripe';
import { In, Repository } from 'typeorm';
import { AuthService } from '../auth.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthGuard } from '../guards/auth.guard';

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly billingSubscriptionService: BillingSubscriptionService,
    private readonly billingUsageService: BillingUsageService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    @InjectRepository(EspConnection)
    private readonly espConnectionRepository: Repository<EspConnection>,
    @InjectRepository(Subscriber)
    private readonly subscriberRepository: Repository<Subscriber>
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string
  ): Promise<{ received: boolean }> {
    try {
      const webhookSecret = this.stripeService.getWebhookSecret();
      if (!webhookSecret) {
        this.logger.error('STRIPE_WEBHOOK_SECRET is not configured');
        throw new InternalServerErrorException('Webhook secret not configured');
      }

      const rawBody = req.body as Buffer;
      if (!rawBody) {
        this.logger.error(
          'Raw body is required for webhook signature verification'
        );
        throw new BadRequestException('Raw body is required');
      }

      let event: Stripe.Event;
      try {
        event = this.stripeService
          .getClient()
          .webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (error: any) {
        this.logger.error(
          `Webhook signature verification failed: ${error.message}`
        );
        throw new BadRequestException(
          `Webhook signature verification failed: ${error.message}`
        );
      }

      this.logger.log(`Received webhook event: ${event.type}`);

      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(
            event.data.object as Stripe.Subscription
          );
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription
          );
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription
          );
          break;
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(
            event.data.object as Stripe.Invoice
          );
          break;
        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error: any) {
      this.logger.error(
        `Error processing webhook: ${error.message}`,
        error.stack
      );
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to process webhook: ${error.message}`
      );
    }
  }

  private async handleSubscriptionCreated(
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    try {
      const customerId = stripeSubscription.customer as string;
      const existingSubscription =
        await this.billingSubscriptionService.findByStripeCustomerId(
          customerId
        );

      if (existingSubscription) {
        await this.billingSubscriptionService.syncFromStripe(
          stripeSubscription,
          existingSubscription.userId
        );
      } else {
        const customer = await this.stripeService
          .getClient()
          .customers.retrieve(customerId);
        if (customer.deleted) return;

        const userId = (customer as Stripe.Customer).metadata?.userId;
        if (!userId) return;

        await this.billingSubscriptionService.syncFromStripe(
          stripeSubscription,
          userId
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Error handling subscription.created: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  private async handleSubscriptionUpdated(
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    try {
      const existingSubscription =
        await this.billingSubscriptionService.findByStripeSubscriptionId(
          stripeSubscription.id
        );

      if (existingSubscription) {
        await this.billingSubscriptionService.syncFromStripe(
          stripeSubscription,
          existingSubscription.userId
        );
      } else {
        const customerId = stripeSubscription.customer as string;
        const subscriptionByCustomer =
          await this.billingSubscriptionService.findByStripeCustomerId(
            customerId
          );

        if (subscriptionByCustomer) {
          await this.billingSubscriptionService.syncFromStripe(
            stripeSubscription,
            subscriptionByCustomer.userId
          );
        } else {
          const customer = await this.stripeService
            .getClient()
            .customers.retrieve(customerId);
          if (customer.deleted) return;

          const userId = (customer as Stripe.Customer).metadata?.userId;
          if (!userId) return;

          await this.billingSubscriptionService.syncFromStripe(
            stripeSubscription,
            userId
          );
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Error handling subscription.updated: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  private async handleSubscriptionDeleted(
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    try {
      const existingSubscription =
        await this.billingSubscriptionService.findByStripeSubscriptionId(
          stripeSubscription.id
        );

      if (existingSubscription) {
        await this.billingSubscriptionService.update(existingSubscription.id, {
          status: BillingSubscriptionStatus.CANCELED,
          canceledAt: new Date(),
          cancelAtPeriodEnd: false,
        });
      }
    } catch (error: any) {
      this.logger.error(
        `Error handling subscription.deleted: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    try {
      if (invoice.id) {
        await this.billingUsageService.updateStatusByInvoiceId(
          invoice.id,
          BillingUsageStatus.PAID
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Error handling invoice.paid: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice
  ): Promise<void> {
    try {
      if (invoice.id) {
        await this.billingUsageService.updateStatusByInvoiceId(
          invoice.id,
          BillingUsageStatus.FAILED
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Error handling invoice.payment_failed: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @Post('create-checkout-session')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async createCheckoutSession(
    @CurrentUser() user: User,
    @Req() req: Request
  ): Promise<{ url: string }> {
    try {
      const frontendUrl = this.resolveFrontendUrl(req);

      // Build success and cancel URLs
      const successUrl = `${frontendUrl}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${frontendUrl}/onboarding/stripe?canceled=true`;

      let existingSubscription =
        await this.billingSubscriptionService.findByUserId(user.id);
      let customerId: string;

      if (existingSubscription?.stripeCustomerId) {
        customerId = existingSubscription.stripeCustomerId;
      } else {
        const customer = await this.stripeService.createCustomer(
          user.email,
          user.id
        );
        customerId = customer.id;

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

      const session = await this.stripeService.createCheckoutSession(
        customerId,
        user.email,
        successUrl,
        cancelUrl
      );

      return { url: session.url || '' };
    } catch (error: any) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException(
        `Failed to create checkout session: ${error.message}`
      );
    }
  }

  @Post('create-portal-session')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async createPortalSession(
    @CurrentUser() user: User,
    @Req() req: Request
  ): Promise<{ url: string }> {
    try {
      const frontendUrl = this.resolveFrontendUrl(req);
      const returnUrl = `${frontendUrl}/dashboard/settings`;

      const existingSubscription =
        await this.billingSubscriptionService.findByUserId(user.id);

      if (!existingSubscription?.stripeCustomerId) {
        throw new BadRequestException(
          'User does not have an active Stripe customer'
        );
      }

      const session = await this.stripeService.createPortalSession(
        existingSubscription.stripeCustomerId,
        returnUrl
      );

      return { url: session.url || '' };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to create portal session: ${error.message}`
      );
    }
  }

  @Get('status')
  @UseGuards(AuthGuard)
  async getBillingStatus(@CurrentUser() user: User): Promise<{
    hasActiveSubscription: boolean;
    subscription: BillingSubscription | null;
    currentPeriodEnd: Date | null;
  }> {
    try {
      const subscription = await this.billingSubscriptionService.findByUserId(
        user.id
      );

      if (!subscription) {
        return {
          hasActiveSubscription: false,
          subscription: null,
          currentPeriodEnd: null,
        };
      }

      const hasActiveSubscription =
        subscription.status === BillingSubscriptionStatus.ACTIVE &&
        !subscription.cancelAtPeriodEnd;

      return {
        hasActiveSubscription,
        subscription,
        currentPeriodEnd: subscription.currentPeriodEnd,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to get billing status: ${error.message}`
      );
    }
  }

  @Get('usage')
  @UseGuards(AuthGuard)
  async getCurrentUsage(@CurrentUser() user: User): Promise<{
    maxSubscriberCount: number;
    calculatedAmount: number;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
  }> {
    try {
      let billingUsage = await this.billingUsageService.getCurrentUsage(
        user.id
      );

      if (!billingUsage) {
        const userConnections = await this.espConnectionRepository.find({
          where: { userId: user.id },
          select: ['id'],
        });
        const connectionIds = userConnections.map((conn) => conn.id);

        let currentSubscriberCount = 0;
        if (connectionIds.length > 0) {
          currentSubscriberCount = await this.subscriberRepository.count({
            where: { espConnectionId: In(connectionIds) },
          });
        }

        await this.billingUsageService.updateUsage(
          user.id,
          currentSubscriberCount
        );

        billingUsage = await this.billingUsageService.getCurrentUsage(user.id);
      }

      if (!billingUsage) {
        throw new InternalServerErrorException(
          'Failed to create or retrieve billing usage'
        );
      }

      return {
        maxSubscriberCount: billingUsage.maxSubscriberCount,
        calculatedAmount: Number(billingUsage.calculatedAmount),
        billingPeriodStart: billingUsage.billingPeriodStart,
        billingPeriodEnd: billingUsage.billingPeriodEnd,
      };
    } catch (error: any) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException(
        `Failed to get current usage: ${error.message}`
      );
    }
  }

  @Get('history')
  @UseGuards(AuthGuard)
  async getBillingHistory(
    @CurrentUser() user: User,
    @Query('limit') limit?: string
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
      const limitNumber = limit ? parseInt(limit, 10) : 12;
      if (isNaN(limitNumber) || limitNumber < 1) {
        throw new BadRequestException('Limit must be a positive number');
      }

      const billingHistory = await this.billingUsageService.getBillingHistory(
        user.id,
        limitNumber
      );

      return billingHistory.map((usage) => ({
        billingPeriodStart: usage.billingPeriodStart,
        billingPeriodEnd: usage.billingPeriodEnd,
        maxSubscriberCount: usage.maxSubscriberCount,
        calculatedAmount: Number(usage.calculatedAmount),
        status: usage.status,
        stripeInvoiceId: usage.stripeInvoiceId,
      }));
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to get billing history: ${error.message}`
      );
    }
  }

  @Post('verify-checkout-session')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyCheckoutSession(
    @CurrentUser() user: User,
    @Body() body: { sessionId: string }
  ): Promise<{ success: true; subscription: BillingSubscription }> {
    try {
      const session = await this.stripeService.getCheckoutSession(
        body.sessionId
      );

      if (session.payment_status !== 'paid') {
        throw new BadRequestException(
          `Checkout session payment status is ${session.payment_status}, expected 'paid'`
        );
      }

      if (session.status !== 'complete') {
        throw new BadRequestException(
          `Checkout session status is ${session.status}, expected 'complete'`
        );
      }

      // Get subscription from session
      // Note: session.subscription can be a string ID or an expanded Subscription object
      const sessionSubscription = session.subscription;
      if (!sessionSubscription) {
        throw new BadRequestException(
          'Checkout session does not have a subscription'
        );
      }

      // Handle both expanded subscription object and string ID
      let stripeSubscription: Stripe.Subscription;
      if (typeof sessionSubscription === 'string') {
        // Subscription is a string ID, need to retrieve it
        stripeSubscription =
          await this.stripeService.getSubscription(sessionSubscription);
      } else {
        // Subscription is already expanded
        stripeSubscription = sessionSubscription;
      }

      let billingSubscription =
        await this.billingSubscriptionService.findByUserId(user.id);

      if (billingSubscription) {
        await this.billingSubscriptionService.syncFromStripe(
          stripeSubscription,
          user.id
        );
        billingSubscription =
          await this.billingSubscriptionService.findByUserId(user.id);
        if (!billingSubscription) {
          throw new InternalServerErrorException(
            'Failed to update billing subscription'
          );
        }
      } else {
        billingSubscription =
          await this.billingSubscriptionService.syncFromStripe(
            stripeSubscription,
            user.id
          );
      }

      if (!user.isOnboarded) {
        try {
          await this.authService.completeOnboarding(user.id);
        } catch (error: any) {
          this.logger.warn(
            `Failed to complete onboarding for user ${user.id}: ${error.message}`
          );
        }
      }

      return {
        success: true,
        subscription: billingSubscription,
      };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to verify checkout session: ${error.message}`
      );
    }
  }

  private resolveFrontendUrl(req: Request): string {
    const configuredUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('NEXT_PUBLIC_URL');

    if (configuredUrl && configuredUrl.trim()) {
      return configuredUrl.replace(/\/+$/, '');
    }

    const forwardedProto = req.get('x-forwarded-proto');
    const forwardedHost = req.get('x-forwarded-host');
    const protocol = forwardedProto
      ? forwardedProto.split(',')[0].trim()
      : req.protocol;
    const host =
      (forwardedHost ? forwardedHost.split(',')[0].trim() : null) ||
      req.get('host') ||
      req.hostname ||
      'localhost:3000';

    return `${protocol}://${host}`.replace(/\/+$/, '');
  }
}
