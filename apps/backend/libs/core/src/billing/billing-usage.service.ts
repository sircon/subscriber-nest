import { BillingUsage, BillingUsageStatus } from '@app/database/entities/billing-usage.entity';
import { EspConnection } from '@app/database/entities/esp-connection.entity';
import { Subscriber } from '@app/database/entities/subscriber.entity';
import { SyncHistory, SyncHistoryStatus } from '@app/database/entities/sync-history.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { BillingCalculationService } from './billing-calculation.service';
import { BillingSubscriptionService } from './billing-subscription.service';
import { StripeService } from './stripe.service';

@Injectable()
export class BillingUsageService {
  constructor(
    @InjectRepository(BillingUsage)
    private billingUsageRepository: Repository<BillingUsage>,
    @InjectRepository(SyncHistory)
    private syncHistoryRepository: Repository<SyncHistory>,
    @InjectRepository(Subscriber)
    private subscriberRepository: Repository<Subscriber>,
    @InjectRepository(EspConnection)
    private espConnectionRepository: Repository<EspConnection>,
    private billingCalculationService: BillingCalculationService,
    private billingSubscriptionService: BillingSubscriptionService,
    private stripeService: StripeService
  ) { }

  /**
   * Get the current billing period (start/end) from the user's Stripe subscription.
   * Returns null if the user has no subscription or currentPeriodStart/End are not set.
   * If our DB has no period but stripeSubscriptionId exists, fetches from Stripe and syncs.
   */
  async getCurrentBillingPeriodForUser(
    userId: string
  ): Promise<{ start: Date; end: Date } | null> {
    let subscription =
      await this.billingSubscriptionService.findByUserId(userId);
    if (!subscription) return null;

    if (subscription.currentPeriodStart && subscription.currentPeriodEnd) {
      return {
        start: subscription.currentPeriodStart,
        end: subscription.currentPeriodEnd,
      };
    }

    // Period missing in our DB; try to refresh from Stripe by subscription ID
    if (subscription.stripeSubscriptionId) {
      try {
        const stripeSubscription =
          await this.stripeService.getSubscription(
            subscription.stripeSubscriptionId
          );
        await this.billingSubscriptionService.syncFromStripe(
          stripeSubscription,
          userId
        );
        const refreshed =
          await this.billingSubscriptionService.findByUserId(userId);
        if (
          refreshed?.currentPeriodStart &&
          refreshed.currentPeriodEnd
        ) {
          return {
            start: refreshed.currentPeriodStart,
            end: refreshed.currentPeriodEnd,
          };
        }
      } catch {
        // ignore
      }
    }

    // Fallback: list by customer (e.g. we never got stripeSubscriptionId from verify-checkout or webhooks)
    if (subscription.stripeCustomerId) {
      try {
        const list = await this.stripeService.listSubscriptionsForCustomer(
          subscription.stripeCustomerId
        );
        const toSync =
          list.find(
            (s) =>
              s.status === 'active' ||
              s.status === 'trialing' ||
              s.status === 'past_due'
          ) || list[0];
        if (toSync) {
          await this.billingSubscriptionService.syncFromStripe(toSync, userId);
          const refreshed =
            await this.billingSubscriptionService.findByUserId(userId);
          if (
            refreshed?.currentPeriodStart &&
            refreshed.currentPeriodEnd
          ) {
            return {
              start: refreshed.currentPeriodStart,
              end: refreshed.currentPeriodEnd,
            };
          }
        }
      } catch {
        // ignore
      }
    }
    return null;
  }

  /**
   * Update billing usage for a user by tracking the maximum subscriber count during the current billing period (from Stripe).
   * Returns { perPublicationMax } when a period exists, or null when there is no Stripe period (no-op).
   */
  async updateUsage(
    userId: string,
    currentSubscriberCount: number
  ): Promise<{ perPublicationMax: Map<string, number> } | null> {
    const period = await this.getCurrentBillingPeriodForUser(userId);
    if (!period) {
      return null;
    }

    const { start, end } = period;
    const perPublicationMax = await this.calculatePerPublicationMaxUsage(
      userId,
      start,
      end
    );

    let totalSubscriberCount = 0;
    for (const count of perPublicationMax.values()) {
      totalSubscriberCount += count;
    }

    let billingUsage = await this.billingUsageRepository.findOne({
      where: {
        userId,
        billingPeriodStart: start,
      },
    });

    if (!billingUsage) {
      billingUsage = this.billingUsageRepository.create({
        userId,
        billingPeriodStart: start,
        billingPeriodEnd: end,
        maxSubscriberCount: totalSubscriberCount,
        status: BillingUsageStatus.PENDING,
      });
    } else {
      if (totalSubscriberCount > billingUsage.maxSubscriberCount) {
        billingUsage.maxSubscriberCount = totalSubscriberCount;
      }
    }

    billingUsage.calculatedAmount = this.billingCalculationService.calculateAmount(
      billingUsage.maxSubscriberCount
    );

    await this.billingUsageRepository.save(billingUsage);
    return { perPublicationMax };
  }

  async findByStripeInvoiceId(
    stripeInvoiceId: string
  ): Promise<BillingUsage | null> {
    return this.billingUsageRepository.findOne({
      where: { stripeInvoiceId },
    });
  }

  async updateStatus(
    id: string,
    status: BillingUsageStatus,
    stripeInvoiceId?: string | null
  ): Promise<BillingUsage> {
    const usage = await this.billingUsageRepository.findOne({
      where: { id },
    });

    if (!usage) {
      throw new NotFoundException(`Billing usage with ID ${id} not found`);
    }

    usage.status = status;
    if (stripeInvoiceId !== undefined) {
      usage.stripeInvoiceId = stripeInvoiceId;
    }

    return this.billingUsageRepository.save(usage);
  }

  async updateStatusByInvoiceId(
    stripeInvoiceId: string,
    status: BillingUsageStatus
  ): Promise<BillingUsage | null> {
    const usage = await this.findByStripeInvoiceId(stripeInvoiceId);
    if (!usage) {
      return null;
    }

    usage.status = status;
    return this.billingUsageRepository.save(usage);
  }

  async getCurrentUsage(userId: string): Promise<BillingUsage | null> {
    const period = await this.getCurrentBillingPeriodForUser(userId);
    if (!period) {
      return null;
    }
    // Find by range (period that contains now) to avoid exact Date match issues (precision, timezone)
    const now = new Date();
    return this.billingUsageRepository.findOne({
      where: {
        userId,
        billingPeriodStart: LessThanOrEqual(now),
        billingPeriodEnd: MoreThan(now),
      },
    });
  }

  async getBillingHistory(
    userId: string,
    limit: number = 12
  ): Promise<BillingUsage[]> {
    const now = new Date();

    return this.billingUsageRepository.find({
      where: {
        userId,
        billingPeriodEnd: LessThan(now),
      },
      order: { billingPeriodStart: 'DESC' },
      take: limit,
    });
  }

  /**
   * Calculate the maximum subscriber count per publication (ESP connection) during a billing period
   */
  async calculatePerPublicationMaxUsage(
    userId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date
  ): Promise<Map<string, number>> {
    const espConnections = await this.espConnectionRepository.find({
      where: { userId },
      select: ['id'],
    });

    const perPublicationMax = new Map<string, number>();

    for (const espConnection of espConnections) {
      const syncHistoryRecords = await this.syncHistoryRepository
        .createQueryBuilder('syncHistory')
        .where('syncHistory.espConnectionId = :espConnectionId', {
          espConnectionId: espConnection.id,
        })
        .andWhere('syncHistory.status = :status', {
          status: SyncHistoryStatus.SUCCESS,
        })
        .andWhere('syncHistory.startedAt >= :billingPeriodStart', {
          billingPeriodStart,
        })
        .andWhere('syncHistory.startedAt < :billingPeriodEnd', {
          billingPeriodEnd,
        })
        .getMany();

      let maxSubscriberCount = 0;
      if (syncHistoryRecords.length > 0) {
        const subscriberCounts = syncHistoryRecords
          .map((record) => record.subscriberCount ?? 0)
          .filter((count) => count > 0);
        if (subscriberCounts.length > 0) {
          maxSubscriberCount = Math.max(...subscriberCounts);
        }
      }

      if (maxSubscriberCount === 0) {
        maxSubscriberCount = await this.subscriberRepository.count({
          where: { espConnectionId: espConnection.id },
        });
      }

      perPublicationMax.set(espConnection.id, maxSubscriberCount);
    }

    return perPublicationMax;
  }

  calculateMeterUsage(perPublicationMax: Map<string, number>): number {
    let totalSubscriberCount = 0;
    for (const count of perPublicationMax.values()) {
      totalSubscriberCount += count;
    }

    if (totalSubscriberCount === 0) {
      return 0;
    }

    return Math.ceil(totalSubscriberCount / 10000);
  }
}
