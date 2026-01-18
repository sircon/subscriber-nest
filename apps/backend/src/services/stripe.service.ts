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
}
