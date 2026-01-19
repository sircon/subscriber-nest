import { BillingUsage, BillingUsageStatus } from '@app/database/entities/billing-usage.entity';
import { EspConnection } from '@app/database/entities/esp-connection.entity';
import { Subscriber } from '@app/database/entities/subscriber.entity';
import { SyncHistory, SyncHistoryStatus } from '@app/database/entities/sync-history.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { BillingCalculationService } from './billing-calculation.service';

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
    private billingCalculationService: BillingCalculationService
  ) {}

  /**
   * Get the start and end dates for the current billing period (calendar month)
   */
  private getCurrentBillingPeriod(): { start: Date; end: Date } {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

    return { start, end };
  }

  /**
   * Update billing usage for a user by tracking the maximum subscriber count during the current billing period
   */
  async updateUsage(
    userId: string,
    currentSubscriberCount: number
  ): Promise<void> {
    const { start, end } = this.getCurrentBillingPeriod();

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
    const { start } = this.getCurrentBillingPeriod();

    return this.billingUsageRepository.findOne({
      where: {
        userId,
        billingPeriodStart: start,
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
        billingPeriodStart: LessThanOrEqual(now),
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
