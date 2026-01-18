import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import {
  BillingUsage,
  BillingUsageStatus,
} from '../entities/billing-usage.entity';
import { BillingCalculationService } from './billing-calculation.service';
import { EspConnectionService } from './esp-connection.service';
import {
  SyncHistory,
  SyncHistoryStatus,
} from '../entities/sync-history.entity';
import { Subscriber } from '../entities/subscriber.entity';

@Injectable()
export class BillingUsageService {
  constructor(
    @InjectRepository(BillingUsage)
    private billingUsageRepository: Repository<BillingUsage>,
    @InjectRepository(SyncHistory)
    private syncHistoryRepository: Repository<SyncHistory>,
    @InjectRepository(Subscriber)
    private subscriberRepository: Repository<Subscriber>,
    private billingCalculationService: BillingCalculationService,
    private espConnectionService: EspConnectionService
  ) {}

  /**
   * Get the start and end dates for the current billing period (calendar month)
   * @returns Object with billingPeriodStart and billingPeriodEnd dates
   */
  private getCurrentBillingPeriod(): { start: Date; end: Date } {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // First day of the month at 00:00:00
    const start = new Date(year, month, 1, 0, 0, 0, 0);

    // Last day of the month at 23:59:59.999
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

    return { start, end };
  }

  /**
   * Update billing usage for a user by tracking the maximum subscriber count during the current billing period
   * @param userId - The ID of the user
   * @param currentSubscriberCount - The current subscriber count for the user
   * @returns Promise that resolves when usage is updated
   */
  async updateUsage(
    userId: string,
    currentSubscriberCount: number
  ): Promise<void> {
    const { start, end } = this.getCurrentBillingPeriod();

    // Find existing billing usage record for current period
    let billingUsage = await this.billingUsageRepository.findOne({
      where: {
        userId,
        billingPeriodStart: start,
      },
    });

    if (!billingUsage) {
      // Create new billing usage record for current period
      billingUsage = this.billingUsageRepository.create({
        userId,
        billingPeriodStart: start,
        billingPeriodEnd: end,
        maxSubscriberCount: currentSubscriberCount,
        status: BillingUsageStatus.PENDING,
      });
    } else {
      // Update maxSubscriberCount if current count is higher than stored max
      if (currentSubscriberCount > billingUsage.maxSubscriberCount) {
        billingUsage.maxSubscriberCount = currentSubscriberCount;
      }
    }

    // Calculate billing amount using BillingCalculationService
    const calculatedAmount = this.billingCalculationService.calculateAmount(
      billingUsage.maxSubscriberCount
    );

    // Update calculatedAmount field
    billingUsage.calculatedAmount = calculatedAmount;

    // Save the billing usage record
    await this.billingUsageRepository.save(billingUsage);
  }

  /**
   * Find billing usage by Stripe invoice ID
   * @param stripeInvoiceId - The Stripe invoice ID
   * @returns Billing usage record or null if not found
   */
  async findByStripeInvoiceId(
    stripeInvoiceId: string
  ): Promise<BillingUsage | null> {
    return this.billingUsageRepository.findOne({
      where: { stripeInvoiceId },
    });
  }

  /**
   * Update billing usage status and invoice ID
   * @param id - The billing usage ID
   * @param status - New status
   * @param stripeInvoiceId - Stripe invoice ID (optional)
   * @returns Updated billing usage record
   */
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

  /**
   * Update billing usage by Stripe invoice ID
   * @param stripeInvoiceId - The Stripe invoice ID
   * @param status - New status
   * @returns Updated billing usage record
   */
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

  /**
   * Get current month's billing usage for a user
   * @param userId - The ID of the user
   * @returns Current month's billing usage record or null if not found
   */
  async getCurrentUsage(userId: string): Promise<BillingUsage | null> {
    const { start } = this.getCurrentBillingPeriod();

    return this.billingUsageRepository.findOne({
      where: {
        userId,
        billingPeriodStart: start,
      },
    });
  }

  /**
   * Get billing history for a user
   * @param userId - The ID of the user
   * @param limit - Maximum number of records to return (default: 12)
   * @returns Array of billing usage records ordered by billingPeriodStart DESC
   * Only returns past billing periods (billingPeriodStart <= current date)
   */
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
   * @param userId - The ID of the user
   * @param billingPeriodStart - Start date of the billing period
   * @param billingPeriodEnd - End date of the billing period
   * @returns Map with ESP connection ID as key and max subscriber count as value
   */
  async calculatePerPublicationMaxUsage(
    userId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date
  ): Promise<Map<string, number>> {
    // Get all ESP connections for the user
    const espConnections =
      await this.espConnectionService.findAllByUserId(userId);

    const perPublicationMax = new Map<string, number>();

    // For each ESP connection, find the maximum subscriber count from sync history
    for (const espConnection of espConnections) {
      // Query SyncHistory records within the billing period for this ESP connection
      // Only consider successful syncs (status = 'success')
      // Use query builder to handle date range properly
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

      // Find maximum subscriberCount from sync history records
      let maxSubscriberCount = 0;
      if (syncHistoryRecords.length > 0) {
        const subscriberCounts = syncHistoryRecords
          .map((record) => record.subscriberCount ?? 0)
          .filter((count) => count > 0);
        if (subscriberCounts.length > 0) {
          maxSubscriberCount = Math.max(...subscriberCounts);
        }
      }

      // If no sync history exists or max is 0, use current subscriber count as fallback
      if (maxSubscriberCount === 0) {
        const currentSubscriberCount = await this.subscriberRepository.count({
          where: { espConnectionId: espConnection.id },
        });
        maxSubscriberCount = currentSubscriberCount;
      }

      // Store the max subscriber count for this ESP connection
      perPublicationMax.set(espConnection.id, maxSubscriberCount);
    }

    return perPublicationMax;
  }
}
