import { Injectable } from "@nestjs/common";

@Injectable()
export class BillingCalculationService {
  /**
   * Calculate billing amount based on subscriber count using tiered pricing
   * Pricing: $5 for first 10,000 subscribers, then $1 per each additional 10,000 subscribers
   *
   * Examples:
   * - 5,000 subscribers = $5
   * - 15,000 subscribers = $6 ($5 base + $1 for additional 10k)
   * - 25,000 subscribers = $7 ($5 base + $2 for additional 20k)
   * - 100,000 subscribers = $14 ($5 base + $9 for additional 90k)
   *
   * @param subscriberCount - Number of subscribers
   * @returns Calculated amount in dollars (decimal)
   */
  calculateAmount(subscriberCount: number): number {
    // Handle edge cases: 0 or negative subscribers
    if (subscriberCount <= 0) {
      return 0;
    }

    // Base price for first 10,000 subscribers
    const BASE_PRICE = 5;
    const BASE_TIER = 10000;
    const ADDITIONAL_TIER_PRICE = 1;
    const ADDITIONAL_TIER_SIZE = 10000;

    // If subscriber count is within the base tier (0-10,000), return base price
    if (subscriberCount <= BASE_TIER) {
      return BASE_PRICE;
    }

    // Calculate additional tiers beyond the base tier
    const subscribersBeyondBase = subscriberCount - BASE_TIER;
    // Calculate how many additional 10k tiers we need (round up)
    const additionalTiers = Math.ceil(
      subscribersBeyondBase / ADDITIONAL_TIER_SIZE,
    );

    // Total amount = base price + (additional tiers * price per tier)
    const totalAmount = BASE_PRICE + additionalTiers * ADDITIONAL_TIER_PRICE;

    // Round to 2 decimal places to handle any floating point precision issues
    return Math.round(totalAmount * 100) / 100;
  }
}
