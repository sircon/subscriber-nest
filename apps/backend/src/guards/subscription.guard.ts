import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { BillingSubscriptionService } from '../services/billing-subscription.service';
import {
  BillingSubscription,
  BillingSubscriptionStatus,
} from '../entities/billing-subscription.entity';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly billingSubscriptionService: BillingSubscriptionService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Active subscription required');
    }

    // Get user's subscription
    const subscription = await this.billingSubscriptionService.findByUserId(
      user.id
    );

    // If no subscription exists, deny access
    if (!subscription) {
      throw new ForbiddenException('Active subscription required');
    }

    // Check if subscription is active (status is ACTIVE and not canceled at period end)
    const isActive =
      subscription.status === BillingSubscriptionStatus.ACTIVE &&
      !subscription.cancelAtPeriodEnd;

    // Check if subscription is canceled but still in grace period (currentPeriodEnd is in the future)
    const isInGracePeriod =
      subscription.status === BillingSubscriptionStatus.CANCELED &&
      subscription.currentPeriodEnd &&
      subscription.currentPeriodEnd > new Date();

    // Allow access if subscription is active or in grace period
    if (isActive || isInGracePeriod) {
      return true;
    }

    // Deny access if subscription is inactive
    throw new ForbiddenException('Active subscription required');
  }
}
