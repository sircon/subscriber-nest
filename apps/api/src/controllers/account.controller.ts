import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  UseGuards,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, BillingSubscription } from "@subscriber-nest/shared/entities";
import { AuthGuard } from "../guards/auth.guard";
import { CurrentUser } from "../decorators/current-user.decorator";
import { StripeService } from "../services/stripe.service";
import { BillingSubscriptionService } from "../services/billing-subscription.service";

@Controller("account")
export class AccountController {
  private readonly logger = new Logger(AccountController.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly stripeService: StripeService,
    private readonly billingSubscriptionService: BillingSubscriptionService,
  ) {}

  /**
   * Request account deletion
   * POST /account/delete
   * Sets deleteRequestedAt timestamp and cancels Stripe subscription immediately
   */
  @Post("delete")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@CurrentUser() user: User): Promise<{ message: string }> {
    try {
      this.logger.log(`Account deletion requested for user: ${user.id}`);

      // Set deleteRequestedAt timestamp
      await this.userRepository.update(user.id, {
        deleteRequestedAt: new Date(),
      });

      // Cancel Stripe subscription immediately if exists
      const subscription = await this.billingSubscriptionService.findByUserId(
        user.id,
      );
      if (subscription && subscription.stripeSubscriptionId) {
        try {
          await this.stripeService.cancelSubscription(
            subscription.stripeSubscriptionId,
            false,
          );
          this.logger.log(`Canceled Stripe subscription for user: ${user.id}`);
        } catch (error: any) {
          // Log error but don't fail the deletion request
          this.logger.error(
            `Failed to cancel Stripe subscription for user ${user.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `Account deletion requested successfully for user: ${user.id}`,
      );

      return {
        message:
          "Account deletion requested. Your account will be deleted after 30 days.",
      };
    } catch (error: any) {
      this.logger.error(
        `Error requesting account deletion for user ${user.id}: ${error.message}`,
        error.stack,
      );

      // Wrap unknown errors
      throw new InternalServerErrorException(
        `Failed to request account deletion: ${error.message}`,
      );
    }
  }
}
