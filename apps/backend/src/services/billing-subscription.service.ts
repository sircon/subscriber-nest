import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BillingSubscription,
  BillingSubscriptionStatus,
} from '../entities/billing-subscription.entity';
import Stripe from 'stripe';

@Injectable()
export class BillingSubscriptionService {
  constructor(
    @InjectRepository(BillingSubscription)
    private billingSubscriptionRepository: Repository<BillingSubscription>
  ) {}

  /**
   * Find a billing subscription by user ID
   * @param userId - The ID of the user
   * @returns Billing subscription or null if not found
   */
  async findByUserId(userId: string): Promise<BillingSubscription | null> {
    return this.billingSubscriptionRepository.findOne({
      where: { userId },
    });
  }

  /**
   * Find a billing subscription by Stripe customer ID
   * @param stripeCustomerId - The Stripe customer ID
   * @returns Billing subscription or null if not found
   */
  async findByStripeCustomerId(
    stripeCustomerId: string
  ): Promise<BillingSubscription | null> {
    return this.billingSubscriptionRepository.findOne({
      where: { stripeCustomerId },
    });
  }

  /**
   * Find a billing subscription by Stripe subscription ID
   * @param stripeSubscriptionId - The Stripe subscription ID
   * @returns Billing subscription or null if not found
   */
  async findByStripeSubscriptionId(
    stripeSubscriptionId: string
  ): Promise<BillingSubscription | null> {
    return this.billingSubscriptionRepository.findOne({
      where: { stripeSubscriptionId },
    });
  }

  /**
   * Create a new billing subscription
   * @param data - Subscription data
   * @returns Created billing subscription
   */
  async create(data: {
    userId: string;
    stripeCustomerId: string;
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
    status: BillingSubscriptionStatus;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: Date | null;
  }): Promise<BillingSubscription> {
    const subscription = this.billingSubscriptionRepository.create(data);
    return this.billingSubscriptionRepository.save(subscription);
  }

  /**
   * Update a billing subscription
   * @param id - The subscription ID
   * @param data - Update data
   * @returns Updated billing subscription
   * @throws NotFoundException if subscription not found
   */
  async update(
    id: string,
    data: Partial<BillingSubscription>
  ): Promise<BillingSubscription> {
    const subscription = await this.billingSubscriptionRepository.findOne({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Billing subscription with ID ${id} not found`
      );
    }

    Object.assign(subscription, data);
    return this.billingSubscriptionRepository.save(subscription);
  }

  /**
   * Update a billing subscription by Stripe subscription ID
   * @param stripeSubscriptionId - The Stripe subscription ID
   * @param data - Update data
   * @returns Updated billing subscription
   * @throws NotFoundException if subscription not found
   */
  async updateByStripeSubscriptionId(
    stripeSubscriptionId: string,
    data: Partial<BillingSubscription>
  ): Promise<BillingSubscription> {
    const subscription = await this.billingSubscriptionRepository.findOne({
      where: { stripeSubscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Billing subscription with Stripe subscription ID ${stripeSubscriptionId} not found`
      );
    }

    Object.assign(subscription, data);
    return this.billingSubscriptionRepository.save(subscription);
  }

  /**
   * Sync subscription data from Stripe subscription object
   * @param stripeSubscription - Stripe subscription object
   * @param userId - User ID (optional, will try to find by customer ID if not provided)
   * @returns Updated or created billing subscription
   */
  async syncFromStripe(
    stripeSubscription: Stripe.Subscription,
    userId?: string
  ): Promise<BillingSubscription> {
    // Map Stripe status to our enum
    const statusMap: Record<string, BillingSubscriptionStatus> = {
      active: BillingSubscriptionStatus.ACTIVE,
      canceled: BillingSubscriptionStatus.CANCELED,
      past_due: BillingSubscriptionStatus.PAST_DUE,
      trialing: BillingSubscriptionStatus.TRIALING,
      incomplete: BillingSubscriptionStatus.INCOMPLETE,
      incomplete_expired: BillingSubscriptionStatus.INCOMPLETE_EXPIRED,
    };

    const status =
      statusMap[stripeSubscription.status] ||
      BillingSubscriptionStatus.INCOMPLETE;

    // Find existing subscription by Stripe subscription ID
    let subscription = await this.findByStripeSubscriptionId(
      stripeSubscription.id
    );

    // If not found, try to find by customer ID
    if (!subscription) {
      subscription = await this.findByStripeCustomerId(
        stripeSubscription.customer as string
      );
    }

    // Prepare update data
    const updateData: Partial<BillingSubscription> = {
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: stripeSubscription.items.data[0]?.price.id || null,
      status,
      currentPeriodStart: (stripeSubscription as any).current_period_start
        ? new Date((stripeSubscription as any).current_period_start * 1000)
        : null,
      currentPeriodEnd: (stripeSubscription as any).current_period_end
        ? new Date((stripeSubscription as any).current_period_end * 1000)
        : null,
      cancelAtPeriodEnd:
        (stripeSubscription as any).cancel_at_period_end || false,
      canceledAt: (stripeSubscription as any).canceled_at
        ? new Date((stripeSubscription as any).canceled_at * 1000)
        : null,
    };

    if (subscription) {
      // Update existing subscription
      return this.update(subscription.id, updateData);
    } else {
      // Create new subscription (requires userId and stripeCustomerId)
      if (!userId) {
        throw new Error('userId is required when creating a new subscription');
      }

      return this.create({
        userId,
        stripeCustomerId: stripeSubscription.customer as string,
        stripeSubscriptionId: updateData.stripeSubscriptionId || null,
        stripePriceId: updateData.stripePriceId || null,
        status: updateData.status!,
        currentPeriodStart: updateData.currentPeriodStart || null,
        currentPeriodEnd: updateData.currentPeriodEnd || null,
        cancelAtPeriodEnd: updateData.cancelAtPeriodEnd || false,
        canceledAt: updateData.canceledAt || null,
      });
    }
  }

  /**
   * Check if a user has an active subscription
   * @param userId - The ID of the user
   * @returns True if user has active subscription, false otherwise
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.findByUserId(userId);
    if (!subscription) {
      return false;
    }

    return (
      subscription.status === BillingSubscriptionStatus.ACTIVE &&
      !subscription.cancelAtPeriodEnd
    );
  }
}
