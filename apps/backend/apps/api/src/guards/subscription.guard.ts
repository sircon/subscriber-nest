import { BillingSubscriptionService } from '@app/core/billing/billing-subscription.service';
import { BillingSubscriptionStatus } from '@app/database/entities/billing-subscription.entity';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

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

    if (user.deleteRequestedAt) {
      return true;
    }

    const subscription = await this.billingSubscriptionService.findByUserId(
      user.id
    );

    if (!subscription) {
      throw new ForbiddenException('Active subscription required');
    }

    const isActive =
      subscription.status === BillingSubscriptionStatus.ACTIVE &&
      !subscription.cancelAtPeriodEnd;

    const isInGracePeriod =
      subscription.status === BillingSubscriptionStatus.CANCELED &&
      subscription.currentPeriodEnd &&
      subscription.currentPeriodEnd > new Date();

    if (isActive || isInGracePeriod) {
      return true;
    }

    throw new ForbiddenException('Active subscription required');
  }
}
