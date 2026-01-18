import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EspConnection,
  EspType,
  EspConnectionStatus,
  EspSyncStatus,
  AuthMethod,
} from '../entities/esp-connection.entity';
import { EncryptionService } from './encryption.service';
import { IEspConnector } from '../interfaces/esp-connector.interface';
import { BeehiivConnector } from '../connectors/beehiiv.connector';
import { KitConnector } from '../connectors/kit.connector';
import { MailchimpConnector } from '../connectors/mailchimp.connector';
import { OAuthTokenRefreshService } from './oauth-token-refresh.service';

@Injectable()
export class EspConnectionService {
  constructor(
    @InjectRepository(EspConnection)
    private espConnectionRepository: Repository<EspConnection>,
    private encryptionService: EncryptionService,
    private beehiivConnector: BeehiivConnector,
    private kitConnector: KitConnector,
    private mailchimpConnector: MailchimpConnector,
    private oauthTokenRefreshService: OAuthTokenRefreshService
  ) {}

  /**
   * Gets the appropriate ESP connector based on ESP type
   * @param espType - The type of ESP
   * @returns The ESP connector instance
   * @throws BadRequestException if ESP type is not supported
   */
  private getConnector(espType: EspType): IEspConnector {
    switch (espType) {
      case EspType.BEEHIIV:
        return this.beehiivConnector;
      case EspType.KIT:
        return this.kitConnector;
      case EspType.MAILCHIMP:
        return this.mailchimpConnector;
      default:
        throw new BadRequestException(`Unsupported ESP type: ${espType}`);
    }
  }

  /**
   * Creates a new ESP connection after validating the API key
   * @param userId - The ID of the user creating the connection
   * @param espType - The type of ESP (e.g., 'beehiiv')
   * @param apiKey - The API key to validate and store (will be encrypted)
   * @param publicationId - The publication ID to connect to
   * @returns The created ESP connection (without encrypted API key in response)
   * @throws BadRequestException if API key validation fails or ESP type is invalid
   */
  async createConnection(
    userId: string,
    espType: string,
    apiKey: string,
    publicationId: string
  ): Promise<EspConnection> {
    // Validate espType
    if (!Object.values(EspType).includes(espType as EspType)) {
      throw new BadRequestException(`Invalid ESP type: ${espType}`);
    }

    const espTypeEnum = espType as EspType;

    // Get the appropriate connector
    const connector = this.getConnector(espTypeEnum);

    // Validate API key using the connector
    const isValid = await connector.validateApiKey(apiKey, publicationId);
    if (!isValid) {
      throw new BadRequestException('Invalid API key or publication ID');
    }

    // Encrypt the API key before storing
    const encryptedApiKey = this.encryptionService.encrypt(apiKey);

    // Create the ESP connection
    const espConnection = this.espConnectionRepository.create({
      userId,
      espType: espTypeEnum,
      authMethod: AuthMethod.API_KEY,
      encryptedApiKey,
      publicationId,
      status: EspConnectionStatus.ACTIVE,
      lastValidatedAt: new Date(),
    });

    // Save to database
    const savedConnection =
      await this.espConnectionRepository.save(espConnection);

    return savedConnection;
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
    const publications =
      await connector.fetchPublicationsWithOAuth(accessToken);

    // Extract publication IDs from publications array
    const publicationIds = publications.map((pub) => pub.id);

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
      publicationIds: publicationIds.length > 0 ? publicationIds : null,
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

  /**
   * Finds an ESP connection by ID and optionally validates ownership
   * @param id - The ID of the ESP connection
   * @param userId - Optional user ID to validate ownership
   * @returns The ESP connection if found
   * @throws NotFoundException if connection not found
   * @throws BadRequestException if user doesn't own the connection (when userId provided)
   */
  async findById(id: string, userId?: string): Promise<EspConnection> {
    const connection = await this.espConnectionRepository.findOne({
      where: { id },
    });

    if (!connection) {
      throw new NotFoundException(`ESP connection with ID ${id} not found`);
    }

    // Validate ownership if userId is provided
    if (userId && connection.userId !== userId) {
      throw new BadRequestException(
        'You do not have permission to access this ESP connection'
      );
    }

    return connection;
  }

  /**
   * Updates the sync status of an ESP connection
   * @param id - The ID of the ESP connection
   * @param syncStatus - The new sync status
   * @returns The updated ESP connection
   * @throws NotFoundException if connection not found
   */
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
    return await this.espConnectionRepository.save(connection);
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
