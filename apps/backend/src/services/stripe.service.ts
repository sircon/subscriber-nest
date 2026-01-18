import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover',
    });
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
   * Create a Stripe customer
   * @param email - Customer email address
   * @param userId - User ID to store in metadata
   * @returns Stripe customer object
   * @throws InternalServerErrorException if Stripe API call fails
   */
  async createCustomer(email: string, userId: string): Promise<Stripe.Customer> {
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
          `Failed to create Stripe customer: ${error.message}`,
        );
      }
      // Handle unexpected errors
      throw new InternalServerErrorException(
        `Unexpected error creating Stripe customer: ${error.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a Stripe subscription with monthly billing cycle and metered billing
   * @param customerId - Stripe customer ID
   * @returns Stripe subscription object
   * @throws InternalServerErrorException if Stripe API call fails or price ID is not configured
   */
  async createSubscription(customerId: string): Promise<Stripe.Subscription> {
    try {
      const priceId = this.configService.get<string>('STRIPE_PRICE_ID');
      if (!priceId) {
        throw new InternalServerErrorException(
          'STRIPE_PRICE_ID environment variable is required to create subscriptions',
        );
      }

      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price: priceId,
          },
        ],
      });

      return subscription;
    } catch (error: any) {
      // Handle Stripe API errors
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to create Stripe subscription: ${error.message}`,
        );
      }
      // Handle unexpected errors (including our own InternalServerErrorException)
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      // Handle unexpected errors
      throw new InternalServerErrorException(
        `Unexpected error creating Stripe subscription: ${error.message || 'Unknown error'}`,
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
    cancelAtPeriodEnd: boolean,
  ): Promise<Stripe.Subscription> {
    try {
      if (cancelAtPeriodEnd) {
        // Cancel at period end - update subscription to cancel at period end
        const subscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
        return subscription;
      } else {
        // Cancel immediately
        const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
        return subscription;
      }
    } catch (error: any) {
      // Handle Stripe API errors
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to cancel Stripe subscription: ${error.message}`,
        );
      }
      // Handle unexpected errors
      throw new InternalServerErrorException(
        `Unexpected error canceling Stripe subscription: ${error.message || 'Unknown error'}`,
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
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error: any) {
      // Handle Stripe API errors
      if (error instanceof Stripe.errors.StripeError) {
        throw new InternalServerErrorException(
          `Failed to get Stripe subscription: ${error.message}`,
        );
      }
      // Handle unexpected errors
      throw new InternalServerErrorException(
        `Unexpected error getting Stripe subscription: ${error.message || 'Unknown error'}`,
      );
    }
  }
}
