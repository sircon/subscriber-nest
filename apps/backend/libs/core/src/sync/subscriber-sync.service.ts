import { EspConnection, EspType } from '@app/database/entities/esp-connection.entity';
import { Subscriber } from '@app/database/entities/subscriber.entity';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BillingSubscriptionService } from '../billing/billing-subscription.service';
import { BillingUsageService } from '../billing/billing-usage.service';
import { StripeService } from '../billing/stripe.service';
import { EncryptionService } from '../encryption/encryption.service';
import { BeehiivConnector } from '../esp/beehiiv.connector';
import { IEspConnector } from '../esp/esp-connector.interface';
import { CreateSubscriberDto } from './create-subscriber.dto';
import { SubscriberMapperService } from './subscriber-mapper.service';

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
   * Upsert a subscriber (create if not exists, update if exists)
   * Uses externalId + espConnectionId as unique key
   */
  private async upsertSubscriber(data: CreateSubscriberDto): Promise<Subscriber> {
    const existing = await this.subscriberRepository.findOne({
      where: {
        externalId: data.externalId,
        espConnectionId: data.espConnectionId,
      },
    });

    if (existing) {
      Object.assign(existing, data);
      return this.subscriberRepository.save(existing);
    } else {
      const subscriber = this.subscriberRepository.create(data);
      return this.subscriberRepository.save(subscriber);
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
          const createSubscriberDto =
            this.subscriberMapperService.mapToCreateSubscriberDto(
              subscriberData,
              espConnectionId
            );

          await this.upsertSubscriber(createSubscriberDto);
        } catch (error: any) {
          console.error(
            `Failed to process subscriber ${subscriberData.id} for connection ${espConnectionId}:`,
            error.message
          );
        }
      }

      // After successful sync, update billing usage for the user
      const userId = espConnection.userId;

      const userConnections = await this.espConnectionRepository.find({
        where: { userId },
        select: ['id'],
      });

      const connectionIds = userConnections.map((conn) => conn.id);

      let totalSubscriberCount = 0;
      if (connectionIds.length > 0) {
        totalSubscriberCount = await this.subscriberRepository.count({
          where: {
            espConnectionId: In(connectionIds),
          },
        });
      }

      await this.billingUsageService.updateUsage(userId, totalSubscriberCount);

      // Report usage to Stripe meter
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const billingPeriodStart = new Date(year, month, 1, 0, 0, 0, 0);
        const billingPeriodEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const perPublicationMax =
          await this.billingUsageService.calculatePerPublicationMaxUsage(
            userId,
            billingPeriodStart,
            billingPeriodEnd
          );

        const meterUsageUnits =
          this.billingUsageService.calculateMeterUsage(perPublicationMax);

        const subscription =
          await this.billingSubscriptionService.findByUserId(userId);

        if (
          subscription &&
          subscription.stripeSubscriptionItemId &&
          meterUsageUnits > 0
        ) {
          await this.stripeService.reportUsageToMeter(
            subscription.stripeSubscriptionItemId,
            meterUsageUnits
          );

          this.logger.log(
            `Reported ${meterUsageUnits} units to Stripe meter for user ${userId}`
          );
        }
      } catch (meterError: any) {
        this.logger.error(
          `Failed to report usage to Stripe meter for user ${userId}: ${meterError.message}`,
          meterError.stack
        );
      }
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to sync subscribers for connection ${espConnectionId}: ${error.message}`
      );
    }
  }
}
