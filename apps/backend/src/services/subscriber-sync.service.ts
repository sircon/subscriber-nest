import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EspConnection, EspType } from '../entities/esp-connection.entity';
import { Subscriber } from '../entities/subscriber.entity';
import { EncryptionService } from './encryption.service';
import { IEspConnector } from '../interfaces/esp-connector.interface';
import { BeehiivConnector } from '../connectors/beehiiv.connector';
import { SubscriberMapperService } from './subscriber-mapper.service';
import { SubscriberService } from './subscriber.service';
import { BillingUsageService } from './billing-usage.service';
import { BillingSubscriptionService } from './billing-subscription.service';
import { StripeService } from './stripe.service';

/**
 * Service for syncing subscribers from ESPs to our database
 */
@Injectable()
export class SubscriberSyncService {
  private readonly logger = new Logger(SubscriberSyncService.name);

  constructor(
    @InjectRepository(EspConnection)
    private espConnectionRepository: Repository<EspConnection>,
    @InjectRepository(Subscriber)
    private subscriberRepository: Repository<Subscriber>,
    private encryptionService: EncryptionService,
    private beehiivConnector: BeehiivConnector,
    private subscriberMapperService: SubscriberMapperService,
    private subscriberService: SubscriberService,
    private billingUsageService: BillingUsageService,
    private billingSubscriptionService: BillingSubscriptionService,
    private stripeService: StripeService
  ) {}

  /**
   * Gets the appropriate ESP connector based on ESP type
   * @param espType - The type of ESP
   * @returns The ESP connector instance
   * @throws InternalServerErrorException if ESP type is not supported
   */
  private getConnector(espType: EspType): IEspConnector {
    switch (espType) {
      case EspType.BEEHIIV:
        return this.beehiivConnector;
      default:
        throw new InternalServerErrorException(
          `Unsupported ESP type: ${espType}`
        );
    }
  }

  /**
   * Syncs subscribers from an ESP connection to our database
   * - Fetches subscribers using the ESP connector
   * - Encrypts emails and creates masked emails
   * - Maps ESP data to our schema
   * - Stores subscribers in database (upsert by externalId + espConnectionId)
   * - Stores ESP-specific fields in metadata JSONB column
   *
   * @param espConnectionId - The ID of the ESP connection to sync
   * @throws NotFoundException if ESP connection is not found
   * @throws InternalServerErrorException if sync fails
   */
  async syncSubscribers(espConnectionId: string): Promise<void> {
    // Retrieve ESP connection from database
    const espConnection = await this.espConnectionRepository.findOne({
      where: { id: espConnectionId },
    });

    if (!espConnection) {
      throw new NotFoundException(
        `ESP connection not found: ${espConnectionId}`
      );
    }

    try {
      // Decrypt the API key
      const apiKey = this.encryptionService.decrypt(
        espConnection.encryptedApiKey
      );

      // Get the appropriate ESP connector
      const connector = this.getConnector(espConnection.espType);

      // Fetch subscribers from ESP
      const subscribers = await connector.fetchSubscribers(
        apiKey,
        espConnection.publicationId
      );

      // Process each subscriber: map and upsert
      for (const subscriberData of subscribers) {
        try {
          // Map ESP subscriber data to our database schema
          const createSubscriberDto =
            this.subscriberMapperService.mapToCreateSubscriberDto(
              subscriberData,
              espConnectionId
            );

          // Upsert subscriber (create if not exists, update if exists)
          await this.subscriberService.upsertSubscriber(createSubscriberDto);
        } catch (error: any) {
          // Log error for individual subscriber but continue processing others
          console.error(
            `Failed to process subscriber ${subscriberData.id} for connection ${espConnectionId}:`,
            error.message
          );
          // Continue processing other subscribers even if one fails
        }
      }

      // After successful sync, update billing usage for the user
      // Count total subscribers across all user's ESP connections
      const userId = espConnection.userId;

      // Get all ESP connection IDs for the user
      const userConnections = await this.espConnectionRepository.find({
        where: { userId },
        select: ['id'],
      });

      const connectionIds = userConnections.map((conn) => conn.id);

      // Count all subscribers across all user's ESP connections
      let totalSubscriberCount = 0;
      if (connectionIds.length > 0) {
        totalSubscriberCount = await this.subscriberRepository.count({
          where: {
            espConnectionId: In(connectionIds),
          },
        });
      }

      // Update billing usage (tracks max subscriber count for current billing period)
      await this.billingUsageService.updateUsage(userId, totalSubscriberCount);

      // After successful sync and recording subscriber count in SyncHistory (done by processor),
      // calculate per-publication max usage and report to Stripe meter
      try {
        // Get current billing period dates
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const billingPeriodStart = new Date(year, month, 1, 0, 0, 0, 0);
        const billingPeriodEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

        // Calculate per-publication max usage for current billing period
        const perPublicationMax =
          await this.billingUsageService.calculatePerPublicationMaxUsage(
            userId,
            billingPeriodStart,
            billingPeriodEnd
          );

        // Sum the maximums from all publications and convert to 10k units (rounded up)
        const meterUsageUnits =
          this.billingUsageService.calculateMeterUsage(perPublicationMax);

        // Get user's active subscription and subscription item ID
        const subscription =
          await this.billingSubscriptionService.findByUserId(userId);

        if (
          subscription &&
          subscription.stripeSubscriptionItemId &&
          meterUsageUnits > 0
        ) {
          // Report usage to Stripe meter
          await this.stripeService.reportUsageToMeter(
            subscription.stripeSubscriptionItemId,
            meterUsageUnits
          );

          this.logger.log(
            `Reported ${meterUsageUnits} units to Stripe meter for user ${userId}`
          );
        } else {
          if (!subscription) {
            this.logger.debug(
              `No subscription found for user ${userId}, skipping meter reporting`
            );
          } else if (!subscription.stripeSubscriptionItemId) {
            this.logger.debug(
              `No subscription item ID for user ${userId}, skipping meter reporting`
            );
          } else if (meterUsageUnits === 0) {
            this.logger.debug(
              `Meter usage is 0 for user ${userId}, skipping meter reporting`
            );
          }
        }
      } catch (meterError: any) {
        // Log error but don't fail sync if meter reporting fails
        this.logger.error(
          `Failed to report usage to Stripe meter for user ${userId}: ${meterError.message}`,
          meterError.stack
        );
        // Continue - sync should not fail if meter reporting fails
      }
    } catch (error: any) {
      // Re-throw NotFoundException as-is
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Wrap other errors in InternalServerErrorException
      throw new InternalServerErrorException(
        `Failed to sync subscribers for connection ${espConnectionId}: ${error.message}`
      );
    }
  }
}
