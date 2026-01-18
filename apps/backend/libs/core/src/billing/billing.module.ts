import { Module } from '@nestjs/common';
import { BillingCalculationService } from './billing-calculation.service';
import { BillingUsageService } from './billing-usage.service';
import { BillingSubscriptionService } from './billing-subscription.service';
import { StripeService } from './stripe.service';
import { DatabaseModule } from '@app/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [
    BillingCalculationService,
    BillingUsageService,
    BillingSubscriptionService,
    StripeService,
  ],
  exports: [
    BillingCalculationService,
    BillingUsageService,
    BillingSubscriptionService,
    StripeService,
  ],
})
export class BillingModule {}
