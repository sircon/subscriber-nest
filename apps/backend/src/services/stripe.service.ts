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

  /**
   * Get the Stripe client instance
   * @returns Stripe client
   */
  getClient(): Stripe {
    return this.stripe;
  }

  /**
   * Get the Stripe webhook secret
   * @returns Webhook secret string
   */
  getWebhookSecret(): string {
    return this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
  }

  /**
   * Get the Stripe meter ID
   * @returns Meter ID string
   */
  getMeterId(): string {
    return this.meterId;
  }

  /**
   * Create a Stripe customer
   * @param email - Customer email address
   * @param userId - User ID to store in metadata
   * @returns Stripe customer object
   * @throws InternalServerErrorException if Stripe API call fails
   */
  async createCustomer(
    email: string,
    userId: string
  ): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      });

      return customer;
    } catch (error: any) {
      // Handle Stripe API errors
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to create Stripe customer: ${error.message}`
        );
      }
      // Handle unexpected errors
      throw new InternalServerErrorException(
        `Unexpected error creating Stripe customer: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Create a Stripe subscription with monthly billing cycle and metered billing
   * @param customerId - Stripe customer ID
   * @returns Stripe subscription object
   * @throws InternalServerErrorException if Stripe API call fails or meter ID is not configured
   */
  async createSubscription(customerId: string): Promise<Stripe.Subscription> {
    try {
      // Use meter ID for metered billing
      const meterId = this.meterId;
      if (!meterId) {
        throw new InternalServerErrorException(
          'STRIPE_METER_ID environment variable is required to create subscriptions'
        );
      }

      // Use type assertion for price_data since Stripe TypeScript types may not include all meter-related fields
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price_data: {
              currency: 'usd',
              recurring: {
                interval: 'month',
                usage_type: 'metered',
              },
              billing_scheme: 'per_unit',
              product_data: {
                name: 'SubscriberNest Usage',
              },
              // Reference the meter ID for metered billing
              meter: meterId,
            } as any,
          },
        ],
      });

      return subscription;
    } catch (error: any) {
      // Handle Stripe API errors
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to create Stripe subscription: ${error.message}`
        );
      }
      // Handle unexpected errors (including our own InternalServerErrorException)
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      // Handle unexpected errors
      throw new InternalServerErrorException(
        `Unexpected error creating Stripe subscription: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Cancel a Stripe subscription
   * @param subscriptionId - Stripe subscription ID
   * @param cancelAtPeriodEnd - If true, cancel at the end of the current period; if false, cancel immediately
   * @returns Stripe subscription object
   * @throws InternalServerErrorException if Stripe API call fails
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean
  ): Promise<Stripe.Subscription> {
    try {
      if (cancelAtPeriodEnd) {
        // Cancel at period end - update subscription to cancel at period end
        const subscription = await this.stripe.subscriptions.update(
          subscriptionId,
          {
            cancel_at_period_end: true,
          }
        );
        return subscription;
      } else {
        // Cancel immediately
        const subscription =
          await this.stripe.subscriptions.cancel(subscriptionId);
        return subscription;
      }
    } catch (error: any) {
      // Handle Stripe API errors
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to cancel Stripe subscription: ${error.message}`
        );
      }
      // Handle unexpected errors
      throw new InternalServerErrorException(
        `Unexpected error canceling Stripe subscription: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Get a Stripe subscription by ID
   * @param subscriptionId - Stripe subscription ID
   * @returns Stripe subscription object
   * @throws InternalServerErrorException if Stripe API call fails
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error: any) {
      // Handle Stripe API errors
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to get Stripe subscription: ${error.message}`
        );
      }
      // Handle unexpected errors
      throw new InternalServerErrorException(
        `Unexpected error getting Stripe subscription: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Create a Stripe invoice item for a customer
   * @param customerId - Stripe customer ID
   * @param amount - Amount in dollars (will be converted to cents)
   * @param description - Description of the invoice item
   * @returns Stripe invoice item object
   * @throws InternalServerErrorException if Stripe API call fails
   */
  async createInvoiceItem(
    customerId: string,
    amount: number,
    description: string
  ): Promise<Stripe.InvoiceItem> {
    try {
      // Convert dollars to cents for Stripe
      const amountInCents = Math.round(amount * 100);

      const invoiceItem = await this.stripe.invoiceItems.create({
        customer: customerId,
        amount: amountInCents,
        currency: 'usd',
        description,
      });

      return invoiceItem;
    } catch (error: any) {
      // Handle Stripe API errors
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to create Stripe invoice item: ${error.message}`
        );
      }
      // Handle unexpected errors
      throw new InternalServerErrorException(
        `Unexpected error creating Stripe invoice item: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Create and finalize a Stripe invoice for a customer
   * @param customerId - Stripe customer ID
   * @returns Stripe invoice object
   * @throws InternalServerErrorException if Stripe API call fails
   */
  async createAndFinalizeInvoice(customerId: string): Promise<Stripe.Invoice> {
    try {
      // Create invoice (this will include all pending invoice items)
      const invoice = await this.stripe.invoices.create({
        customer: customerId,
        auto_advance: true, // Automatically finalize and attempt payment
      });

      // Finalize the invoice
      const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(
        invoice.id
      );

      return finalizedInvoice;
    } catch (error: any) {
      // Handle Stripe API errors
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to create and finalize Stripe invoice: ${error.message}`
        );
      }
      // Handle unexpected errors
      throw new InternalServerErrorException(
        `Unexpected error creating and finalizing Stripe invoice: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Create a Stripe Checkout session for subscription
   * @param customerId - Stripe customer ID
   * @param customerEmail - Customer email address
   * @param successUrl - URL to redirect to after successful checkout
   * @param cancelUrl - URL to redirect to if checkout is canceled
   * @returns Stripe checkout session object
   * @throws InternalServerErrorException if Stripe API call fails or price ID is not configured
   */
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

      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          metadata: {
            // Store customer ID in subscription metadata for webhook handling
            customerId,
          },
        },
      });

      return session;
    } catch (error: any) {
      // Handle Stripe API errors
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to create Stripe checkout session: ${error.message}`
        );
      }
      // Handle unexpected errors (including our own InternalServerErrorException)
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      // Handle unexpected errors
      throw new InternalServerErrorException(
        `Unexpected error creating Stripe checkout session: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Create a Stripe Customer Portal session
   * @param customerId - Stripe customer ID
   * @param returnUrl - URL to redirect to after portal session ends
   * @returns Stripe billing portal session object
   * @throws InternalServerErrorException if Stripe API call fails
   */
  async createPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return session;
    } catch (error: any) {
      // Handle Stripe API errors
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to create Stripe portal session: ${error.message}`
        );
      }
      // Handle unexpected errors
      throw new InternalServerErrorException(
        `Unexpected error creating Stripe portal session: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve a Stripe Checkout session by ID
   * @param sessionId - Stripe checkout session ID
   * @returns Stripe checkout session object
   * @throws InternalServerErrorException if Stripe API call fails
   */
  async getCheckoutSession(
    sessionId: string
  ): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription'],
      });

      return session;
    } catch (error: any) {
      // Handle Stripe API errors
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to retrieve Stripe checkout session: ${error.message}`
        );
      }
      // Handle unexpected errors
      throw new InternalServerErrorException(
        `Unexpected error retrieving Stripe checkout session: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Report usage to Stripe meter for a subscription item
   * @param subscriptionItemId - Stripe subscription item ID
   * @param quantity - Number of 10k units (already calculated and rounded up)
   * @param timestamp - Optional timestamp for the usage record (defaults to current time)
   * @returns Stripe usage record object
   * @throws InternalServerErrorException if Stripe API call fails
   */
  async reportUsageToMeter(
    subscriptionItemId: string,
    quantity: number,
    timestamp?: Date
  ): Promise<any> {
    try {
      // Convert Date to Unix timestamp (seconds) if provided, otherwise use current time
      const timestampSeconds = timestamp
        ? Math.floor(timestamp.getTime() / 1000)
        : undefined;

      // Use type assertion since Stripe TypeScript types may not include UsageRecord
      const usageRecord = await (
        this.stripe.subscriptionItems as any
      ).createUsageRecord(subscriptionItemId, {
        quantity,
        timestamp: timestampSeconds,
      });

      return usageRecord;
    } catch (error: any) {
      // Handle Stripe API errors
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to report usage to Stripe meter: ${error.message}`
        );
      }
      // Handle unexpected errors
      throw new InternalServerErrorException(
        `Unexpected error reporting usage to Stripe meter: ${error.message || 'Unknown error'}`
      );
    }
  }
}
