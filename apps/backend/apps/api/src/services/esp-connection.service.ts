import { EncryptionService } from '@app/core/encryption/encryption.service';
import { BeehiivConnector } from '@app/core/esp/beehiiv.connector';
import { KitConnector } from '@app/core/esp/kit.connector';
import { MailchimpConnector } from '@app/core/esp/mailchimp.connector';
import { IEspConnector } from '@app/core/esp/esp-connector.interface';
// New connectors
import { ActiveCampaignConnector } from '@app/core/esp/active-campaign.connector';
import { BrevoConnector } from '@app/core/esp/brevo.connector';
import { CampaignMonitorConnector } from '@app/core/esp/campaign-monitor.connector';
import { ConstantContactConnector } from '@app/core/esp/constant-contact.connector';
import { CustomerIoConnector } from '@app/core/esp/customer-io.connector';
import { EmailOctopusConnector } from '@app/core/esp/email-octopus.connector';
import { GhostConnector } from '@app/core/esp/ghost.connector';
import { IterableConnector } from '@app/core/esp/iterable.connector';
import { MailerLiteConnector } from '@app/core/esp/mailerlite.connector';
import { OmedaConnector } from '@app/core/esp/omeda.connector';
import { PostUpConnector } from '@app/core/esp/postup.connector';
import { SailthruConnector } from '@app/core/esp/sailthru.connector';
import { SendGridConnector } from '@app/core/esp/sendgrid.connector';
import { SparkPostConnector } from '@app/core/esp/sparkpost.connector';
import {
  EspConnection,
  EspConnectionStatus,
  EspSyncStatus,
  EspType,
  AuthMethod,
} from '@app/database/entities/esp-connection.entity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuthTokenRefreshService } from '@app/core/oauth/oauth-token-refresh.service';

@Injectable()
export class EspConnectionService {
  constructor(
    @InjectRepository(EspConnection)
    private espConnectionRepository: Repository<EspConnection>,
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
    private oauthTokenRefreshService: OAuthTokenRefreshService
  ) { }

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
        throw new BadRequestException(`Unsupported ESP type: ${espType}`);
    }
  }

  async createConnection(
    userId: string,
    espType: string,
    apiKey: string,
    publicationId: string
  ): Promise<EspConnection> {
    if (!Object.values(EspType).includes(espType as EspType)) {
      throw new BadRequestException(`Invalid ESP type: ${espType}`);
    }

    const espTypeEnum = espType as EspType;
    const connector = this.getConnector(espTypeEnum);

    const isValid = await connector.validateApiKey(apiKey, publicationId);
    if (!isValid) {
      throw new BadRequestException('Invalid API key or publication ID');
    }

    const encryptedApiKey = this.encryptionService.encrypt(apiKey);

    // Fetch all available lists (publications/segments/lists depending on ESP)
    // Note: fetchPublications() returns lists/segments/publications depending on ESP terminology
    let publicationIds: string[] | null = null;
    let listNames: string[] | null = null;

    try {
      const publications = await connector.fetchPublications(apiKey);
      
      if (publications && publications.length > 0) {
        // Extract IDs and names from fetched publications
        // Default to all lists selected if none specified
        publicationIds = publications.map((pub) => pub.id);
        listNames = publications.map((pub) => pub.name || '');
      }
    } catch (error: any) {
      // Handle errors gracefully - log but don't fail connection creation
      // Connection will be created without list names, which can be fetched later
      console.error(
        `Failed to fetch lists for ESP connection (${espTypeEnum}):`,
        error.message
      );
      // Continue with null values - user can update lists later
    }

    const espConnection = this.espConnectionRepository.create({
      userId,
      espType: espTypeEnum,
      authMethod: AuthMethod.API_KEY,
      encryptedApiKey,
      publicationId, // Keep for backward compatibility
      publicationIds, // Array of all list IDs (default: all selected)
      listNames, // Array of list display names
      status: EspConnectionStatus.ACTIVE,
      lastValidatedAt: new Date(),
    });

    return this.espConnectionRepository.save(espConnection);
  }

  /**
   * Creates a new OAuth-based ESP connection after validating the access token
   * @param userId - The ID of the user creating the connection
   * @param espType - The type of ESP (e.g., 'kit', 'mailchimp')
   * @param accessToken - The OAuth access token to validate and store (will be encrypted)
   * @param refreshToken - The OAuth refresh token to store (will be encrypted)
   * @param expiresIn - The number of seconds until the access token expires
   * @returns The created ESP connection
   * @throws BadRequestException if access token validation fails, ESP type is invalid, or OAuth is not supported
   */
  async createOAuthConnection(
    userId: string,
    espType: EspType,
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ): Promise<EspConnection> {
    // Get the appropriate connector
    const connector = this.getConnector(espType);

    // Check if connector supports OAuth
    if (
      !connector.validateAccessToken ||
      !connector.fetchPublicationsWithOAuth
    ) {
      throw new BadRequestException(
        `OAuth is not supported for ESP type: ${espType}`
      );
    }

    // Validate access token using the connector
    const isValid = await connector.validateAccessToken(accessToken);
    if (!isValid) {
      throw new BadRequestException('Invalid OAuth access token');
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = this.encryptionService.encrypt(accessToken);
    const encryptedRefreshToken = this.encryptionService.encrypt(refreshToken);

    // Fetch all publications using the access token
    // Note: fetchPublicationsWithOAuth() returns lists/segments/publications depending on ESP terminology
    let publicationIds: string[] | null = null;
    let listNames: string[] | null = null;

    try {
      const publications =
        await connector.fetchPublicationsWithOAuth(accessToken);

      if (publications && publications.length > 0) {
        // Extract IDs and names from fetched publications
        // Default to all lists selected if none specified
        publicationIds = publications.map((pub) => pub.id);
        listNames = publications.map((pub) => pub.name || '');
      }
    } catch (error: any) {
      // Handle errors gracefully - log but don't fail connection creation
      // Connection will be created without list names, which can be fetched later
      console.error(
        `Failed to fetch lists for OAuth ESP connection (${espType}):`,
        error.message
      );
      // Continue with null values - user can update lists later
    }

    // Calculate token expiry time
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + expiresIn);

    // Create the ESP connection
    const espConnection = this.espConnectionRepository.create({
      userId,
      espType,
      authMethod: AuthMethod.OAUTH,
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt,
      publicationIds: publicationIds && publicationIds.length > 0 ? publicationIds : null,
      listNames, // Array of list display names
      status: EspConnectionStatus.ACTIVE,
      lastValidatedAt: new Date(),
    });

    // Save to database
    const savedConnection =
      await this.espConnectionRepository.save(espConnection);

    return savedConnection;
  }

  /**
   * Finds all ESP connections for a user
   * @param userId - The ID of the user
   * @returns Array of ESP connections belonging to the user
   */
  async findAllByUserId(userId: string): Promise<EspConnection[]> {
    return this.espConnectionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, userId?: string): Promise<EspConnection> {
    const connection = await this.espConnectionRepository.findOne({
      where: { id },
    });

    if (!connection) {
      throw new NotFoundException(`ESP connection with ID ${id} not found`);
    }

    if (userId && connection.userId !== userId) {
      throw new BadRequestException(
        'You do not have permission to access this ESP connection'
      );
    }

    return connection;
  }

  async updateSyncStatus(
    id: string,
    syncStatus: EspSyncStatus
  ): Promise<EspConnection> {
    const connection = await this.espConnectionRepository.findOne({
      where: { id },
    });

    if (!connection) {
      throw new NotFoundException(`ESP connection with ID ${id} not found`);
    }

    connection.syncStatus = syncStatus;
    return this.espConnectionRepository.save(connection);
  }

  /**
   * Gets the subscriber count from the ESP API for a specific connection
   * This is a lightweight method that doesn't fetch all subscriber data
   * @param id - The ID of the ESP connection
   * @param userId - Optional user ID to validate ownership
   * @returns The total number of subscribers from the ESP API
   * @throws NotFoundException if connection not found
   * @throws BadRequestException if user doesn't own the connection (when userId provided)
   */
  async getSubscriberCount(id: string, userId?: string): Promise<number> {
    const connection = await this.findById(id, userId);

    if (connection.authMethod === AuthMethod.API_KEY) {
      if (!connection.encryptedApiKey || !connection.publicationId) {
        throw new BadRequestException(
          'API key or publication ID is missing for this connection'
        );
      }

      // Decrypt the API key
      const apiKey = this.encryptionService.decrypt(connection.encryptedApiKey);

      // Get the appropriate connector
      const connector = this.getConnector(connection.espType);

      // Get subscriber count from the ESP API
      return connector.getSubscriberCount(apiKey, connection.publicationId);
    } else if (connection.authMethod === AuthMethod.OAUTH) {
      if (!connection.encryptedAccessToken) {
        throw new BadRequestException(
          'Access token is missing for this OAuth connection'
        );
      }

      // Use wrapper method that handles token refresh on 401
      return this.getSubscriberCountWithOAuth(connection);
    } else {
      throw new BadRequestException(
        `Unsupported auth method: ${connection.authMethod}`
      );
    }
  }

  /**
   * Gets subscriber count for OAuth connection with automatic token refresh on 401
   * @param connection - The ESP connection (must be OAuth-based)
   * @returns The total number of subscribers
   * @throws BadRequestException if connection is invalid or publication ID is missing
   * @throws InternalServerErrorException if API call fails after token refresh
   */
  private async getSubscriberCountWithOAuth(
    connection: EspConnection
  ): Promise<number> {
    if (!connection.publicationId && !connection.publicationIds) {
      throw new BadRequestException(
        'Publication ID is missing for this OAuth connection'
      );
    }

    // For OAuth, we need to handle multiple publications
    // For now, use the first publication ID (will be enhanced in US-022)
    const publicationId =
      connection.publicationId ||
      (connection.publicationIds && connection.publicationIds[0]);

    if (!publicationId) {
      throw new BadRequestException(
        'No publication ID available for this connection'
      );
    }

    const connector = this.getConnector(connection.espType);

    if (!connector.getSubscriberCountWithOAuth) {
      throw new BadRequestException(
        `OAuth is not supported for ESP type: ${connection.espType}`
      );
    }

    // Decrypt access token
    let accessToken = this.encryptionService.decrypt(
      connection.encryptedAccessToken!
    );

    // Try to get subscriber count with automatic retry on 401
    return this.callOAuthConnectorMethodWithRetry(
      connection,
      async (token: string) => {
        return connector.getSubscriberCountWithOAuth!(token, publicationId);
      },
      accessToken
    );
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
          const refreshResult =
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
   * Deletes an ESP connection and all associated data (subscribers, sync history)
   * @param id - The ID of the ESP connection
   * @param userId - Optional user ID to validate ownership
   * @throws NotFoundException if connection not found
   * @throws BadRequestException if user doesn't own the connection (when userId provided)
   */
  async deleteConnection(id: string, userId?: string): Promise<void> {
    // Validate connection exists and user owns it
    const connection = await this.findById(id, userId);

    // Delete the connection (cascade will handle subscribers and sync history)
    // But we'll also explicitly delete to be safe and follow the pattern from account deletion
    await this.espConnectionRepository.remove(connection);
  }
}
