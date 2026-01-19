import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly meterId: string;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET'
    );
    const meterId = this.configService.get<string>('STRIPE_METER_ID');

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }

    if (!meterId) {
      throw new Error('STRIPE_METER_ID environment variable is required');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover',
    });

    this.meterId = meterId;
  }

  getClient(): Stripe {
    return this.stripe;
  }

  getWebhookSecret(): string {
    return this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
  }

  getMeterId(): string {
    return this.meterId;
  }

  async createCustomer(
    email: string,
    userId: string
  ): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        metadata: { userId },
      });
      return customer;
    } catch (error: any) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to create Stripe customer: ${error.message}`
        );
      }
      throw new InternalServerErrorException(
        `Unexpected error creating Stripe customer: ${error.message || 'Unknown error'}`
      );
    }
  }

  async createSubscription(customerId: string): Promise<Stripe.Subscription> {
    try {
      const meterId = this.meterId;
      if (!meterId) {
        throw new InternalServerErrorException(
          'STRIPE_METER_ID environment variable is required to create subscriptions'
        );
      }

      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price_data: {
              currency: 'usd',
              recurring: { interval: 'month', usage_type: 'metered' },
              billing_scheme: 'per_unit',
              product_data: { name: 'SubscriberNest Usage' },
              meter: meterId,
            } as any,
          },
        ],
      });
      return subscription;
    } catch (error: any) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to create Stripe subscription: ${error.message}`
        );
      }
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException(
        `Unexpected error creating Stripe subscription: ${error.message || 'Unknown error'}`
      );
    }
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean
  ): Promise<Stripe.Subscription> {
    try {
      if (cancelAtPeriodEnd) {
        return await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }
      return await this.stripe.subscriptions.cancel(subscriptionId);
    } catch (error: any) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to cancel Stripe subscription: ${error.message}`
        );
      }
      throw new InternalServerErrorException(
        `Unexpected error canceling Stripe subscription: ${error.message || 'Unknown error'}`
      );
    }
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch (error: any) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to get Stripe subscription: ${error.message}`
        );
      }
      throw new InternalServerErrorException(
        `Unexpected error getting Stripe subscription: ${error.message || 'Unknown error'}`
      );
    }
  }

  async createInvoiceItem(
    customerId: string,
    amount: number,
    description: string
  ): Promise<Stripe.InvoiceItem> {
    try {
      const amountInCents = Math.round(amount * 100);
      return await this.stripe.invoiceItems.create({
        customer: customerId,
        amount: amountInCents,
        currency: 'usd',
        description,
      });
    } catch (error: any) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to create Stripe invoice item: ${error.message}`
        );
      }
      throw new InternalServerErrorException(
        `Unexpected error creating Stripe invoice item: ${error.message || 'Unknown error'}`
      );
    }
  }

  async createAndFinalizeInvoice(customerId: string): Promise<Stripe.Invoice> {
    try {
      const invoice = await this.stripe.invoices.create({
        customer: customerId,
        auto_advance: true,
      });
      return await this.stripe.invoices.finalizeInvoice(invoice.id);
    } catch (error: any) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to create and finalize Stripe invoice: ${error.message}`
        );
      }
      throw new InternalServerErrorException(
        `Unexpected error creating and finalizing Stripe invoice: ${error.message || 'Unknown error'}`
      );
    }
  }

  async createCheckoutSession(
    customerId: string,
    customerEmail: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    try {
      const priceId = this.configService.get<string>('STRIPE_PRICE_ID');
      if (!priceId) {
        throw new InternalServerErrorException(
          'STRIPE_PRICE_ID environment variable is required to create checkout sessions'
        );
      }

      return await this.stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          metadata: { customerId },
        },
      });
    } catch (error: any) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to create Stripe checkout session: ${error.message}`
        );
      }
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException(
        `Unexpected error creating Stripe checkout session: ${error.message || 'Unknown error'}`
      );
    }
  }

  async createPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    try {
      return await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
    } catch (error: any) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to create Stripe portal session: ${error.message}`
        );
      }
      throw new InternalServerErrorException(
        `Unexpected error creating Stripe portal session: ${error.message || 'Unknown error'}`
      );
    }
  }

  async getCheckoutSession(
    sessionId: string
  ): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription'],
      });
    } catch (error: any) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to retrieve Stripe checkout session: ${error.message}`
        );
      }
      throw new InternalServerErrorException(
        `Unexpected error retrieving Stripe checkout session: ${error.message || 'Unknown error'}`
      );
    }
  }

  async reportUsageToMeter(
    subscriptionItemId: string,
    quantity: number,
    timestamp?: Date
  ): Promise<any> {
    try {
      const timestampSeconds = timestamp
        ? Math.floor(timestamp.getTime() / 1000)
        : undefined;

      return await (this.stripe.subscriptionItems as any).createUsageRecord(
        subscriptionItemId,
        { quantity, timestamp: timestampSeconds }
      );
    } catch (error: any) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to report usage to Stripe meter: ${error.message}`
        );
      }
      throw new InternalServerErrorException(
        `Unexpected error reporting usage to Stripe meter: ${error.message || 'Unknown error'}`
      );
    }
  }
}
