import { BillingSubscriptionService } from '@app/core/billing/billing-subscription.service';
import { StripeService } from '@app/core/billing/stripe.service';
import { User } from '@app/database/entities/user.entity';
import {
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthGuard } from '../guards/auth.guard';

@Controller('account')
export class AccountController {
  private readonly logger = new Logger(AccountController.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly stripeService: StripeService,
    private readonly billingSubscriptionService: BillingSubscriptionService
  ) {}

  @Post('delete')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@CurrentUser() user: User): Promise<{ message: string }> {
    try {
      this.logger.log(`Account deletion requested for user: ${user.id}`);

      await this.userRepository.update(user.id, {
        deleteRequestedAt: new Date(),
      });

      const subscription = await this.billingSubscriptionService.findByUserId(
        user.id
      );
      if (subscription?.stripeSubscriptionId) {
        try {
          await this.stripeService.cancelSubscription(
            subscription.stripeSubscriptionId,
            false
          );
          this.logger.log(`Canceled Stripe subscription for user: ${user.id}`);
        } catch (error: any) {
          this.logger.error(
            `Failed to cancel Stripe subscription for user ${user.id}: ${error.message}`,
            error.stack
          );
        }
      }

      this.logger.log(
        `Account deletion requested successfully for user: ${user.id}`
      );

      return {
        message:
          'Account deletion requested. Your account will be deleted after 30 days.',
      };
    } catch (error: any) {
      this.logger.error(
        `Error requesting account deletion for user ${user.id}: ${error.message}`,
        error.stack
      );
      throw new InternalServerErrorException(
        `Failed to request account deletion: ${error.message}`
      );
    }
  }
}
