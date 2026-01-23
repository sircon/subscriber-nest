import {
  EspConnection,
  EspType,
  AuthMethod,
} from '@app/database/entities/esp-connection.entity';
import { Subscriber } from '@app/database/entities/subscriber.entity';
import {
  SyncHistory,
  SyncHistoryStatus,
} from '@app/database/entities/sync-history.entity';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BillingSubscriptionService } from '../billing/billing-subscription.service';
import { BillingUsageService } from '../billing/billing-usage.service';
import { StripeService } from '../billing/stripe.service';
import { EncryptionService } from '../encryption/encryption.service';
import { BeehiivConnector } from '../esp/beehiiv.connector';
import { KitConnector } from '../esp/kit.connector';
import { MailchimpConnector } from '../esp/mailchimp.connector';
import { IEspConnector } from '../esp/esp-connector.interface';
// New connectors
import { ActiveCampaignConnector } from '../esp/active-campaign.connector';
import { BrevoConnector } from '../esp/brevo.connector';
import { CampaignMonitorConnector } from '../esp/campaign-monitor.connector';
import { ConstantContactConnector } from '../esp/constant-contact.connector';
import { CustomerIoConnector } from '../esp/customer-io.connector';
import { EmailOctopusConnector } from '../esp/email-octopus.connector';
import { GhostConnector } from '../esp/ghost.connector';
import { IterableConnector } from '../esp/iterable.connector';
import { MailerLiteConnector } from '../esp/mailerlite.connector';
import { OmedaConnector } from '../esp/omeda.connector';
import { PostUpConnector } from '../esp/postup.connector';
import { SailthruConnector } from '../esp/sailthru.connector';
import { SendGridConnector } from '../esp/sendgrid.connector';
import { SparkPostConnector } from '../esp/sparkpost.connector';
import { CreateSubscriberDto } from './create-subscriber.dto';
import { SubscriberMapperService } from './subscriber-mapper.service';
import { OAuthTokenRefreshService } from '../oauth/oauth-token-refresh.service';

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
    @InjectRepository(SyncHistory)
    private syncHistoryRepository: Repository<SyncHistory>,
    private encryptionService: EncryptionService,
    // Existing connectors
    private beehiivConnector: BeehiivConnector,
    private kitConnector: KitConnector,
    private mailchimpConnector: MailchimpConnector,
    // New connectors
    private activeCampaignConnector: ActiveCampaignConnector,
    private brevoConnector: BrevoConnector,
    private campaignMonitorConnector: CampaignMonitorConnector,
    private constantContactConnector: ConstantContactConnector,
    private customerIoConnector: CustomerIoConnector,
    private emailOctopusConnector: EmailOctopusConnector,
    private ghostConnector: GhostConnector,
    private iterableConnector: IterableConnector,
    private mailerLiteConnector: MailerLiteConnector,
    private omedaConnector: OmedaConnector,
    private postUpConnector: PostUpConnector,
    private sailthruConnector: SailthruConnector,
    private sendGridConnector: SendGridConnector,
    private sparkPostConnector: SparkPostConnector,
    private oauthTokenRefreshService: OAuthTokenRefreshService,
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
      // Existing connectors
      case EspType.BEEHIIV:
        return this.beehiivConnector;
      case EspType.KIT:
        return this.kitConnector;
      case EspType.MAILCHIMP:
        return this.mailchimpConnector;
      // New connectors
      case EspType.ACTIVE_CAMPAIGN:
        return this.activeCampaignConnector;
      case EspType.BREVO:
        return this.brevoConnector;
      case EspType.CAMPAIGN_MONITOR:
        return this.campaignMonitorConnector;
      case EspType.CONSTANT_CONTACT:
        return this.constantContactConnector;
      case EspType.CUSTOMER_IO:
        return this.customerIoConnector;
      case EspType.EMAIL_OCTOPUS:
        return this.emailOctopusConnector;
      case EspType.GHOST:
        return this.ghostConnector;
      case EspType.ITERABLE:
        return this.iterableConnector;
      case EspType.MAILERLITE:
        return this.mailerLiteConnector;
      case EspType.OMEDA:
        return this.omedaConnector;
      case EspType.POSTUP:
        return this.postUpConnector;
      case EspType.SAILTHRU:
        return this.sailthruConnector;
      case EspType.SENDGRID:
        return this.sendGridConnector;
      case EspType.SPARKPOST:
        return this.sparkPostConnector;
      default:
        throw new InternalServerErrorException(
          `Unsupported ESP type: ${espType}`
        );
    }
  }

  /**
   * Calls an OAuth connector method with automatic token refresh on 401 errors
   * This method handles:
   * - Catching 401 errors from connector methods
   * - Refreshing the OAuth token
   * - Retrying the original call once with the new token
   * - Limiting retry to once per request to prevent infinite loops
   *
   * @param connection - The ESP connection (must be OAuth-based)
   * @param method - The connector method to call (receives access token as parameter)
   * @param accessToken - The current access token
   * @param retried - Internal flag to track if we've already retried (prevents infinite loops)
   * @returns The result of the connector method
   * @throws InternalServerErrorException if method fails after token refresh
   */
  private async callOAuthConnectorMethodWithRetry<T>(
    connection: EspConnection,
    method: (accessToken: string) => Promise<T>,
    accessToken: string,
    retried: boolean = false
  ): Promise<T> {
    try {
      // Call the connector method
      return await method(accessToken);
    } catch (error: any) {
      // Check if this is a 401 error (invalid/expired token)
      const is401Error =
        error.message?.includes('401') ||
        error.message?.includes('Invalid access token') ||
        error.response?.status === 401;

      if (is401Error && !retried) {
        // Token is expired or invalid, try to refresh it
        try {
          // Refresh the token (this updates the connection in the database)
          await this.oauthTokenRefreshService.refreshToken(connection);

          // Reload connection to get updated token
          const updatedConnection = await this.espConnectionRepository.findOne({
            where: { id: connection.id },
          });

          if (!updatedConnection || !updatedConnection.encryptedAccessToken) {
            throw new InternalServerErrorException(
              'Failed to refresh token: connection not found or token missing'
            );
          }

          // Decrypt the new access token
          const newAccessToken = this.encryptionService.decrypt(
            updatedConnection.encryptedAccessToken
          );

          // Retry the original call with the new token (only once)
          return this.callOAuthConnectorMethodWithRetry(
            updatedConnection,
            method,
            newAccessToken,
            true // Mark as retried to prevent infinite loops
          );
        } catch (refreshError: any) {
          // Token refresh failed, throw error
          throw new InternalServerErrorException(
            `Token refresh failed: ${refreshError.message}. Please reconnect your account.`
          );
        }
      }

      // If we've already retried or it's not a 401 error, throw the original error
      throw error;
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

  private getSelectedPublicationIds(
    espConnection: EspConnection
  ): string[] {
    return (
      espConnection.publicationIds ||
      (espConnection.publicationId ? [espConnection.publicationId] : [])
    );
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
      // Get the appropriate ESP connector
      const connector = this.getConnector(espConnection.espType);

      // Handle API key connections
      if (espConnection.authMethod === AuthMethod.API_KEY) {
        if (!espConnection.encryptedApiKey) {
          throw new InternalServerErrorException(
            'API key is missing for this connection'
          );
        }

        // Decrypt the API key
        const apiKey = this.encryptionService.decrypt(
          espConnection.encryptedApiKey
        );

        // Get publication IDs to sync
        // API key connections use publicationIds array, but fallback to single publicationId for backward compatibility
        // Note: publicationIds contains list IDs (terminology varies by ESP: lists, segments, publications)
        const publicationIds = this.getSelectedPublicationIds(espConnection);

        if (publicationIds.length === 0) {
          throw new BadRequestException(
            'No lists selected for this connection. Please select at least one list to sync.'
          );
        }

        const availableLists = await connector.fetchPublications(apiKey);
        const availableListIds = new Set(
          availableLists.map((list) => list.id)
        );
        const invalidListIds = publicationIds.filter(
          (id) => !availableListIds.has(id)
        );
        if (invalidListIds.length > 0) {
          throw new BadRequestException(
            `Selected lists no longer exist for this connection: ${invalidListIds.join(
              ', '
            )}. Please update your list selection.`
          );
        }

        // Track sync results for each publication
        const publicationSyncResults: Array<{
          publicationId: string;
          success: boolean;
          subscriberCount: number;
          error?: string;
        }> = [];

        // Sync each publication
        for (const publicationId of publicationIds) {
          // Create sync history record for this publication
          const syncHistory = this.syncHistoryRepository.create({
            espConnectionId,
            publicationId,
            status: SyncHistoryStatus.SUCCESS,
            startedAt: new Date(),
            completedAt: null,
            errorMessage: null,
          });
          await this.syncHistoryRepository.save(syncHistory);

          try {
            // Fetch subscribers from ESP
            const subscribers = await connector.fetchSubscribers(
              apiKey,
              publicationId
            );

            let subscriberCount = 0;

            // Process each subscriber: map and upsert
            for (const subscriberData of subscribers) {
              try {
                // Map ESP subscriber data to our database schema (include publicationId in metadata)
                const createSubscriberDto =
                  this.subscriberMapperService.mapToCreateSubscriberDto(
                    subscriberData,
                    espConnectionId,
                    publicationId
                  );

                // Upsert subscriber (create if not exists, update if exists)
                await this.upsertSubscriber(createSubscriberDto);
                subscriberCount++;
              } catch (error: any) {
                // Log error for individual subscriber but continue processing others
                this.logger.error(
                  `Failed to process subscriber ${subscriberData.id} for connection ${espConnectionId}, publication ${publicationId}:`,
                  error.message
                );
                // Continue processing other subscribers even if one fails
              }
            }

            // Update sync history with success
            await this.syncHistoryRepository.update(
              { id: syncHistory.id },
              {
                completedAt: new Date(),
                subscriberCount,
              }
            );

            publicationSyncResults.push({
              publicationId,
              success: true,
              subscriberCount,
            });
          } catch (error: any) {
            // Log error for publication but continue syncing other publications
            this.logger.error(
              `Failed to sync publication ${publicationId} for connection ${espConnectionId}:`,
              error.message
            );

            // Update sync history with failure
            await this.syncHistoryRepository.update(
              { id: syncHistory.id },
              {
                status: SyncHistoryStatus.FAILED,
                completedAt: new Date(),
                errorMessage: error.message,
              }
            );

            publicationSyncResults.push({
              publicationId,
              success: false,
              subscriberCount: 0,
              error: error.message,
            });
            // Continue syncing other publications even if one fails
          }
        }

        // Check if all publications failed
        const allFailed = publicationSyncResults.every((r) => !r.success);
        if (allFailed && publicationSyncResults.length > 0) {
          throw new InternalServerErrorException(
            `All publications failed to sync for connection ${espConnectionId}`
          );
        }
      }
      // Handle OAuth connections
      else if (espConnection.authMethod === AuthMethod.OAUTH) {
        if (!espConnection.encryptedAccessToken) {
          throw new InternalServerErrorException(
            'Access token is missing for this OAuth connection'
          );
        }

        // Check if connector supports OAuth
        if (!connector.fetchSubscribersWithOAuth) {
          throw new InternalServerErrorException(
            `OAuth is not supported for ESP type: ${espConnection.espType}`
          );
        }

        // Decrypt access token
        let accessToken = this.encryptionService.decrypt(
          espConnection.encryptedAccessToken
        );

        // Get publication IDs to sync
        // OAuth connections use publicationIds array, but fallback to single publicationId for backward compatibility
        const publicationIds = this.getSelectedPublicationIds(espConnection);

        if (publicationIds.length === 0) {
          throw new BadRequestException(
            'No lists selected for this connection. Please select at least one list to sync.'
          );
        }

        if (!connector.fetchPublicationsWithOAuth) {
          throw new InternalServerErrorException(
            `OAuth is not supported for ESP type: ${espConnection.espType}`
          );
        }

        const availableLists = await this.callOAuthConnectorMethodWithRetry(
          espConnection,
          async (token: string) => {
            return connector.fetchPublicationsWithOAuth!(token);
          },
          accessToken
        );
        const availableListIds = new Set(
          availableLists.map((list) => list.id)
        );
        const invalidListIds = publicationIds.filter(
          (id) => !availableListIds.has(id)
        );
        if (invalidListIds.length > 0) {
          throw new BadRequestException(
            `Selected lists no longer exist for this connection: ${invalidListIds.join(
              ', '
            )}. Please update your list selection.`
          );
        }

        // Track sync results for each publication
        const publicationSyncResults: Array<{
          publicationId: string;
          success: boolean;
          subscriberCount: number;
          error?: string;
        }> = [];

        // Sync each publication
        for (const publicationId of publicationIds) {
          // Create sync history record for this publication
          const syncHistory = this.syncHistoryRepository.create({
            espConnectionId,
            publicationId,
            status: SyncHistoryStatus.SUCCESS,
            startedAt: new Date(),
            completedAt: null,
            errorMessage: null,
          });
          await this.syncHistoryRepository.save(syncHistory);

          try {
            // Fetch subscribers from ESP using OAuth token with automatic retry on 401
            const subscribers = await this.callOAuthConnectorMethodWithRetry(
              espConnection,
              async (token: string) => {
                return connector.fetchSubscribersWithOAuth!(
                  token,
                  publicationId
                );
              },
              accessToken
            );

            // Reload connection in case token was refreshed
            const updatedConnection =
              await this.espConnectionRepository.findOne({
                where: { id: espConnectionId },
              });
            if (updatedConnection?.encryptedAccessToken) {
              accessToken = this.encryptionService.decrypt(
                updatedConnection.encryptedAccessToken
              );
              // Update espConnection reference for next iteration
              Object.assign(espConnection, updatedConnection);
            }

            let subscriberCount = 0;

            // Process each subscriber: map and upsert
            for (const subscriberData of subscribers) {
              try {
                // Map ESP subscriber data to our database schema (include publicationId in metadata)
                const createSubscriberDto =
                  this.subscriberMapperService.mapToCreateSubscriberDto(
                    subscriberData,
                    espConnectionId,
                    publicationId
                  );

                // Upsert subscriber (create if not exists, update if exists)
                await this.upsertSubscriber(createSubscriberDto);
                subscriberCount++;
              } catch (error: any) {
                // Log error for individual subscriber but continue processing others
                this.logger.error(
                  `Failed to process subscriber ${subscriberData.id} for connection ${espConnectionId}, publication ${publicationId}:`,
                  error.message
                );
                // Continue processing other subscribers even if one fails
              }
            }

            // Update sync history with success
            await this.syncHistoryRepository.update(
              { id: syncHistory.id },
              {
                completedAt: new Date(),
                subscriberCount,
              }
            );

            publicationSyncResults.push({
              publicationId,
              success: true,
              subscriberCount,
            });
          } catch (error: any) {
            // Log error for publication but continue syncing other publications
            this.logger.error(
              `Failed to sync publication ${publicationId} for connection ${espConnectionId}:`,
              error.message
            );

            // Update sync history with failure
            await this.syncHistoryRepository.update(
              { id: syncHistory.id },
              {
                status: SyncHistoryStatus.FAILED,
                completedAt: new Date(),
                errorMessage: error.message,
              }
            );

            publicationSyncResults.push({
              publicationId,
              success: false,
              subscriberCount: 0,
              error: error.message,
            });
            // Continue syncing other publications even if one fails
          }
        }

        // Check if all publications failed
        const allFailed = publicationSyncResults.every((r) => !r.success);
        if (allFailed && publicationSyncResults.length > 0) {
          throw new InternalServerErrorException(
            `All publications failed to sync for connection ${espConnectionId}`
          );
        }
      } else {
        throw new InternalServerErrorException(
          `Unsupported auth method: ${espConnection.authMethod}`
        );
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
