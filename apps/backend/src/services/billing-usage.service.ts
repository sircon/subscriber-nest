import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingUsage, BillingUsageStatus } from '../entities/billing-usage.entity';
import { BillingCalculationService } from './billing-calculation.service';

@Injectable()
export class BillingUsageService {
  constructor(
    @InjectRepository(BillingUsage)
    private billingUsageRepository: Repository<BillingUsage>,
    private billingCalculationService: BillingCalculationService,
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
  async updateUsage(userId: string, currentSubscriberCount: number): Promise<void> {
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
      billingUsage.maxSubscriberCount,
    );

    // Update calculatedAmount field
    billingUsage.calculatedAmount = calculatedAmount;

    // Save the billing usage record
    await this.billingUsageRepository.save(billingUsage);
  }
}
