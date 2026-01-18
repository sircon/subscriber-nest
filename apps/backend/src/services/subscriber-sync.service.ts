import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
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

/**
 * Service for syncing subscribers from ESPs to our database
 */
@Injectable()
export class SubscriberSyncService {
  constructor(
    @InjectRepository(EspConnection)
    private espConnectionRepository: Repository<EspConnection>,
    @InjectRepository(Subscriber)
    private subscriberRepository: Repository<Subscriber>,
    private encryptionService: EncryptionService,
    private beehiivConnector: BeehiivConnector,
    private subscriberMapperService: SubscriberMapperService,
    private subscriberService: SubscriberService,
    private billingUsageService: BillingUsageService
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
