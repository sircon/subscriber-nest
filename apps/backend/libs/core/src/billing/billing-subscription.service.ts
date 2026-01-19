import { BillingSubscription, BillingSubscriptionStatus } from '@app/database/entities/billing-subscription.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { Repository } from 'typeorm';

@Injectable()
export class BillingSubscriptionService {
  constructor(
    @InjectRepository(BillingSubscription)
    private billingSubscriptionRepository: Repository<BillingSubscription>
  ) {}

  async findByUserId(userId: string): Promise<BillingSubscription | null> {
    return this.billingSubscriptionRepository.findOne({
      where: { userId },
    });
  }

  async findByStripeCustomerId(
    stripeCustomerId: string
  ): Promise<BillingSubscription | null> {
    return this.billingSubscriptionRepository.findOne({
      where: { stripeCustomerId },
    });
  }

  async findByStripeSubscriptionId(
    stripeSubscriptionId: string
  ): Promise<BillingSubscription | null> {
    return this.billingSubscriptionRepository.findOne({
      where: { stripeSubscriptionId },
    });
  }

  async create(data: {
    userId: string;
    stripeCustomerId: string;
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
    stripeSubscriptionItemId?: string | null;
    status: BillingSubscriptionStatus;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: Date | null;
  }): Promise<BillingSubscription> {
    const subscription = this.billingSubscriptionRepository.create(data);
    return this.billingSubscriptionRepository.save(subscription);
  }

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

  async syncFromStripe(
    stripeSubscription: Stripe.Subscription,
    userId?: string
  ): Promise<BillingSubscription> {
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

    let subscription = await this.findByStripeSubscriptionId(
      stripeSubscription.id
    );

    if (!subscription) {
      subscription = await this.findByStripeCustomerId(
        stripeSubscription.customer as string
      );
    }

    const updateData: Partial<BillingSubscription> = {
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: stripeSubscription.items.data[0]?.price.id || null,
      stripeSubscriptionItemId: stripeSubscription.items.data[0]?.id || null,
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
      return this.update(subscription.id, updateData);
    } else {
      if (!userId) {
        throw new Error('userId is required when creating a new subscription');
      }

      return this.create({
        userId,
        stripeCustomerId: stripeSubscription.customer as string,
        stripeSubscriptionId: updateData.stripeSubscriptionId || null,
        stripePriceId: updateData.stripePriceId || null,
        stripeSubscriptionItemId: updateData.stripeSubscriptionItemId || null,
        status: updateData.status!,
        currentPeriodStart: updateData.currentPeriodStart || null,
        currentPeriodEnd: updateData.currentPeriodEnd || null,
        cancelAtPeriodEnd: updateData.cancelAtPeriodEnd || false,
        canceledAt: updateData.canceledAt || null,
      });
    }
  }

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
