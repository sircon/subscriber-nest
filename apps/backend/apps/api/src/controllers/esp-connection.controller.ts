import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EspConnectionService } from '../services/esp-connection.service';
import { SyncHistoryService } from '../services/sync-history.service';
import { SubscriberService } from '../services/subscriber.service';
import {
  SubscriberExportService,
  ExportFormat,
} from '../services/subscriber-export.service';
import { OAuthStateService } from '../services/oauth-state.service';
import { OAuthConfigService } from '@app/core/oauth/oauth-config.service';
import { OAuthTokenRefreshService } from '@app/core/oauth/oauth-token-refresh.service';
import { EncryptionService } from '@app/core/encryption/encryption.service';
import { CreateEspConnectionDto } from '../dto/create-esp-connection.dto';
import { UpdateSelectedListsDto } from '../dto/update-selected-lists.dto';
import {
  EspConnection,
  EspSyncStatus,
  EspType,
  EspConnectionStatus,
  AuthMethod,
} from '@app/database/entities/esp-connection.entity';
import { SyncHistory } from '@app/database/entities/sync-history.entity';
import { Subscriber } from '@app/database/entities/subscriber.entity';
import { User } from '@app/database/entities/user.entity';
import { AuthGuard } from '../guards/auth.guard';
import { SubscriptionGuard } from '../guards/subscription.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@Controller('esp-connections')
@UseGuards(AuthGuard)
export class EspConnectionController {
  constructor(
    private readonly espConnectionService: EspConnectionService,
    private readonly syncHistoryService: SyncHistoryService,
    private readonly subscriberService: SubscriberService,
    private readonly subscriberExportService: SubscriberExportService,
    private readonly oauthStateService: OAuthStateService,
    private readonly oauthConfigService: OAuthConfigService,
    private readonly oauthTokenRefreshService: OAuthTokenRefreshService,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRepository(EspConnection)
    private readonly espConnectionRepository: Repository<EspConnection>,
    @InjectQueue('subscriber-sync')
    private readonly subscriberSyncQueue: Queue
  ) { }

  @Get()
  async listConnections(
    @CurrentUser() user: User
  ): Promise<Omit<EspConnection, 'encryptedApiKey'>[]> {
    const connections = await this.espConnectionService.findAllByUserId(user.id);
    return connections.map(({ encryptedApiKey, ...connection }) => connection);
  }

  @Get('oauth/initiate/:provider')
  async initiateOAuth(
    @Param('provider') provider: string,
    @Query('onboarding') onboarding: string | undefined,
    @CurrentUser() user: User,
    @Res() res: Response
  ): Promise<void> {
    try {
      // Validate provider
      if (provider !== 'kit' && provider !== 'mailchimp') {
        throw new BadRequestException(
          'Invalid provider. Must be one of: kit, mailchimp'
        );
      }

      // Map provider string to EspType enum
      const espType: EspType =
        provider === 'kit' ? EspType.KIT : EspType.MAILCHIMP;

      // Get OAuth configuration
      let oauthConfig;
      try {
        oauthConfig = this.oauthConfigService.getConfig(espType);
      } catch (error) {
        throw new InternalServerErrorException(
          `OAuth configuration not available for ${provider}. Please contact support.`
        );
      }

      // Get backend URL from environment or construct from request
      const backendUrl =
        this.configService.get<string>('BACKEND_URL') ||
        this.configService.get<string>('API_URL') ||
        'http://localhost:4000';

      // Build redirect URI
      const redirectUri = `${backendUrl}/api/esp-connections/oauth/callback/${provider}`;

      // Check if this is an onboarding flow
      const isOnboarding = onboarding === 'true' || onboarding === '1';

      // Create OAuth state
      const state = await this.oauthStateService.createState(
        user.id,
        espType,
        redirectUri,
        isOnboarding
      );

      // Build authorization URL
      const authUrl = new URL(oauthConfig.authorizationUrl);
      authUrl.searchParams.set('client_id', oauthConfig.clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', oauthConfig.scopes);
      authUrl.searchParams.set('state', state);

      // Redirect to ESP's OAuth authorization page
      res.redirect(authUrl.toString());
    } catch (error) {
      // Handle BadRequestException (400 - invalid provider)
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Handle InternalServerErrorException (500 - missing config)
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      // Handle other errors as 500
      throw new InternalServerErrorException(
        `Failed to initiate OAuth flow for ${provider}`
      );
    }
  }

  @Get('oauth/callback/:provider')
  async oauthCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response
  ): Promise<void> {
    try {
      // Validate provider
      if (provider !== 'kit' && provider !== 'mailchimp') {
        throw new BadRequestException(
          'Invalid provider. Must be one of: kit, mailchimp'
        );
      }

      // Validate required query parameters
      if (!code) {
        throw new BadRequestException('Missing authorization code');
      }
      if (!state) {
        throw new BadRequestException('Missing OAuth state');
      }

      // Map provider string to EspType enum
      const espType: EspType =
        provider === 'kit' ? EspType.KIT : EspType.MAILCHIMP;

      // Validate OAuth state
      let stateValidation;
      try {
        stateValidation = await this.oauthStateService.validateState(
          state,
          espType
        );
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw new BadRequestException('Invalid or expired OAuth state');
        }
        throw error;
      }

      const { userId, redirectUri, isOnboarding } = stateValidation;

      // Get OAuth configuration
      let oauthConfig;
      try {
        oauthConfig = this.oauthConfigService.getConfig(espType);
      } catch (error) {
        throw new InternalServerErrorException(
          `OAuth configuration not available for ${provider}. Please contact support.`
        );
      }

      // Get backend URL for redirect URI
      const backendUrl =
        this.configService.get<string>('BACKEND_URL') ||
        this.configService.get<string>('API_URL') ||
        'http://localhost:4000';
      const callbackRedirectUri = `${backendUrl}/api/esp-connections/oauth/callback/${provider}`;

      // Exchange authorization code for access token
      let tokenResponse;
      try {
        const tokenRequestBody = new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: callbackRedirectUri,
          client_id: oauthConfig.clientId,
          client_secret: oauthConfig.clientSecret,
        });

        const response = await firstValueFrom(
          this.httpService.post<{
            access_token: string;
            refresh_token?: string;
            expires_in?: number;
            token_type?: string;
          }>(oauthConfig.tokenUrl, tokenRequestBody.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          })
        );

        if (!response.data.access_token) {
          throw new InternalServerErrorException(
            'Token exchange failed: No access token in response'
          );
        }

        tokenResponse = response.data;
      } catch (error: any) {
        // Handle token exchange errors
        if (error.response) {
          const status = error.response.status;
          const errorData = error.response.data;
          throw new InternalServerErrorException(
            `Token exchange failed: ${status} - ${JSON.stringify(errorData)}`
          );
        }
        throw new InternalServerErrorException(
          `Token exchange failed: ${error.message}`
        );
      }

      // Calculate token expiry time
      const expiresIn = tokenResponse.expires_in || 3600; // Default to 1 hour if not provided
      const refreshToken = tokenResponse.refresh_token || '';

      // Check if user already has an OAuth connection for this ESP type
      const existingConnections = await this.espConnectionRepository.find({
        where: {
          userId,
          espType,
          authMethod: AuthMethod.OAUTH,
        },
      });

      // If existing connection found, delete it (we'll create a new one with updated tokens)
      if (existingConnections.length > 0) {
        for (const existingConnection of existingConnections) {
          await this.espConnectionRepository.remove(existingConnection);
        }
      }

      // Create OAuth connection using the service method
      let savedConnection;
      try {
        savedConnection = await this.espConnectionService.createOAuthConnection(
          userId,
          espType,
          tokenResponse.access_token,
          refreshToken,
          expiresIn
        );
      } catch (error: any) {
        // Handle connection creation errors
        if (error instanceof BadRequestException) {
          throw new InternalServerErrorException(
            `Failed to create OAuth connection: ${error.message}`
          );
        }
        throw new InternalServerErrorException(
          `Failed to create OAuth connection: ${error.message}`
        );
      }

      // Delete OAuth state after successful use
      await this.oauthStateService.deleteState(state);

      // Trigger sync for all connected publications
      try {
        // Mark connection as syncing before adding to queue
        await this.espConnectionService.updateSyncStatus(
          savedConnection.id,
          EspSyncStatus.SYNCING
        );

        // Add sync job to queue
        // Note: OAuth sync support will be added in US-014
        // For now, we trigger the sync job - it may fail if OAuth sync isn't implemented yet,
        // but the connection is created successfully and user can manually trigger sync later
        await this.subscriberSyncQueue.add('sync-publication', {
          espConnectionId: savedConnection.id,
        });
      } catch (syncError: any) {
        // Log sync trigger error but don't fail the OAuth callback
        // Connection is already created, user can manually trigger sync later
        // This is expected if OAuth sync isn't implemented yet (US-014 will add it)
        console.error(
          `Failed to trigger sync for OAuth connection ${savedConnection.id}:`,
          syncError.message
        );
      }

      // Get frontend URL for redirect
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';

      // Redirect to list selection page for OAuth connections
      // User will select lists, then be redirected to appropriate next page
      const listSelectionUrl = `${frontendUrl}/onboarding/oauth-lists?connectionId=${savedConnection.id}&isOnboarding=${isOnboarding ? 'true' : 'false'}`;
      res.redirect(listSelectionUrl);
    } catch (error) {
      // Handle BadRequestException (400 - invalid provider, missing params, invalid state)
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Handle InternalServerErrorException (500 - missing config, token exchange failure)
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      // Handle other errors as 500
      throw new InternalServerErrorException(
        `Failed to complete OAuth callback for ${provider}`
      );
    }
  }

  @Get(':id')
  async getConnection(
    @Param('id') id: string,
    @CurrentUser() user: User
  ): Promise<Omit<EspConnection, 'encryptedApiKey'>> {
    try {
      const connection = await this.espConnectionService.findById(id, user.id);
      const { encryptedApiKey, ...connectionResponse } = connection;
      return connectionResponse;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) {
        throw new ForbiddenException(
          'You do not have permission to access this ESP connection'
        );
      }
      throw new InternalServerErrorException('Failed to retrieve ESP connection');
    }
  }

  @Get(':id/subscriber-count')
  async getSubscriberCount(
    @Param('id') id: string,
    @CurrentUser() user: User
  ): Promise<{ count: number }> {
    try {
      // Get subscriber count from ESP API (validates ownership internally)
      const count = await this.espConnectionService.getSubscriberCount(
        id,
        user.id
      );
      return { count };
    } catch (error) {
      // Handle NotFoundException from service (404)
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Handle BadRequestException (403 - ownership validation failed)
      if (error instanceof BadRequestException) {
        throw new ForbiddenException(
          'You do not have permission to access this ESP connection'
        );
      }

      // Handle other errors as 500
      throw new InternalServerErrorException(
        'Failed to retrieve subscriber count'
      );
    }
  }

  @Get(':id/subscriber-stats')
  async getSubscriberStats(
    @Param('id') id: string,
    @CurrentUser() user: User
  ): Promise<{ active: number; unsubscribed: number; total: number }> {
    try {
      await this.espConnectionService.findById(id, user.id);
      return await this.subscriberService.getConnectionStats(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw new ForbiddenException(
          'You do not have permission to access this ESP connection'
        );
      }

      throw new InternalServerErrorException(
        'Failed to retrieve subscriber statistics'
      );
    }
  }

  @Get(':id/lists')
  async getLists(
    @Param('id') id: string,
    @CurrentUser() user: User
  ): Promise<Array<{ id: string; name: string;[key: string]: any }>> {
    try {
      // Fetch available lists from ESP API (validates ownership internally)
      // Note: fetchAvailableLists() returns lists/segments/publications depending on ESP terminology
      const lists = await this.espConnectionService.fetchAvailableLists(
        id,
        user.id
      );
      return lists;
    } catch (error) {
      // Handle NotFoundException from service (404 - connection not found)
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Handle BadRequestException (400 - missing API key/token, invalid auth method, or 403 - ownership validation failed)
      if (error instanceof BadRequestException) {
        if (error.message.includes('permission') || error.message.includes('own')) {
          throw new ForbiddenException(
            'You do not have permission to access this ESP connection'
          );
        }
        throw error;
      }

      // Handle other errors as 500
      throw new InternalServerErrorException(
        `Failed to retrieve available lists: ${(error as Error)?.message ?? 'Unknown error'}`
      );
    }
  }

  @Put(':id/lists')
  @HttpCode(HttpStatus.OK)
  async updateSelectedLists(
    @Param('id') id: string,
    @Body() updateSelectedListsDto: UpdateSelectedListsDto,
    @CurrentUser() user: User
  ): Promise<Omit<EspConnection, 'encryptedApiKey' | 'encryptedAccessToken' | 'encryptedRefreshToken'>> {
    try {
      // Update selected lists (validates ownership and list IDs internally)
      const updatedConnection = await this.espConnectionService.updateSelectedLists(
        id,
        updateSelectedListsDto.selectedListIds,
        user.id
      );

      // Return connection without encrypted fields
      const {
        encryptedApiKey,
        encryptedAccessToken,
        encryptedRefreshToken,
        ...connectionResponse
      } = updatedConnection;
      return connectionResponse;
    } catch (error) {
      // Handle NotFoundException from service (404 - connection not found)
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Handle BadRequestException (400 - invalid list IDs, missing API key/token, invalid auth method, or 403 - ownership validation failed)
      if (error instanceof BadRequestException) {
        if (error.message.includes('permission') || error.message.includes('own')) {
          throw new ForbiddenException(
            'You do not have permission to access this ESP connection'
          );
        }
        throw error;
      }

      // Handle other errors as 500
      throw new InternalServerErrorException(
        'Failed to update selected lists'
      );
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createConnection(
    @Body() createEspConnectionDto: CreateEspConnectionDto,
    @CurrentUser() user: User
  ): Promise<Omit<EspConnection, 'encryptedApiKey'>> {
    try {
      const connection = await this.espConnectionService.createConnection(
        user.id,
        createEspConnectionDto.espType,
        createEspConnectionDto.apiKey
      );
      const { encryptedApiKey, ...connectionResponse } = connection;
      return connectionResponse;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to create ESP connection');
    }
  }

  @Post(':id/refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Param('id') id: string,
    @CurrentUser() user: User
  ): Promise<
    Omit<
      EspConnection,
      'encryptedApiKey' | 'encryptedAccessToken' | 'encryptedRefreshToken'
    >
  > {
    try {
      // Validate ESP connection exists and belongs to user
      const connection = await this.espConnectionService.findById(id, user.id);

      // Refresh the OAuth token
      await this.oauthTokenRefreshService.refreshToken(connection);

      // Reload the connection from database to get updated token info
      const updatedConnection = await this.espConnectionService.findById(
        id,
        user.id
      );

      // Return connection without encrypted fields
      const {
        encryptedApiKey,
        encryptedAccessToken,
        encryptedRefreshToken,
        ...connectionResponse
      } = updatedConnection;
      return connectionResponse;
    } catch (error) {
      // Handle NotFoundException from service (404 - connection not found)
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Handle BadRequestException (400 - not OAuth connection, missing refresh token, invalid/expired refresh token)
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Handle BadRequestException (403 - ownership validation failed)
      // Note: This is caught by the findById call above, but we check for it here for completeness
      if (
        error instanceof BadRequestException &&
        error.message.includes('permission')
      ) {
        throw new ForbiddenException(
          'You do not have permission to refresh this ESP connection'
        );
      }

      // Handle InternalServerErrorException (500 - missing config, decryption failure, API errors)
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      // Handle other errors as 500
      throw new InternalServerErrorException('Failed to refresh OAuth token');
    }
  }

  @Post(':id/sync')
  @UseGuards(SubscriptionGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerSync(
    @Param('id') id: string,
    @CurrentUser() user: User
  ): Promise<{
    jobId: string;
    status: string;
    message: string;
    connection: Omit<EspConnection, 'encryptedApiKey'>;
  }> {
    try {
      const connection = await this.espConnectionService.findById(id, user.id);

      if (connection.syncStatus === EspSyncStatus.SYNCING) {
        throw new ConflictException(
          'A sync is already in progress for this ESP connection'
        );
      }

      const selectedPublicationIds =
        connection.publicationIds ||
        (connection.publicationId ? [connection.publicationId] : []);

      if (selectedPublicationIds.length === 0) {
        throw new BadRequestException(
          'No lists selected. Please select at least one list to sync.'
        );
      }

      const updatedConnection =
        await this.espConnectionService.updateSyncStatus(id, EspSyncStatus.SYNCING);

      const job = await this.subscriberSyncQueue.add('sync-publication', {
        espConnectionId: id,
      });

      const { encryptedApiKey, ...connectionResponse } = updatedConnection;
      return {
        jobId: job.id!,
        status: 'queued',
        message: 'Sync job has been queued successfully',
        connection: connectionResponse,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) {
        throw new ForbiddenException(
          'You do not have permission to sync this ESP connection'
        );
      }
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Failed to trigger subscriber sync');
    }
  }

  @Get(':id/sync-history')
  async getSyncHistory(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Query('limit') limit?: string
  ): Promise<Omit<SyncHistory, 'espConnection'>[]> {
    try {
      await this.espConnectionService.findById(id, user.id);
      const parsedLimit = limit ? parseInt(limit, 10) : 50;
      const syncHistory = await this.syncHistoryService.findByEspConnection(
        id,
        parsedLimit
      );
      return syncHistory.map((record) => {
        const { espConnection, ...syncHistoryRecord } = record;
        return syncHistoryRecord;
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) {
        throw new ForbiddenException(
          'You do not have permission to access this ESP connection'
        );
      }
      throw new InternalServerErrorException('Failed to retrieve sync history');
    }
  }

  @Get(':id/subscribers')
  async getSubscribers(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string
  ): Promise<{
    data: Omit<Subscriber, 'encryptedEmail'>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      await this.espConnectionService.findById(id, user.id);
      const parsedPage = page ? parseInt(page, 10) : 1;
      const parsedLimit = limit ? parseInt(limit, 10) : 50;
      return this.subscriberService.findByEspConnectionPaginated(
        id,
        parsedPage,
        parsedLimit,
        status
      );
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) {
        throw new ForbiddenException(
          'You do not have permission to access this ESP connection'
        );
      }
      throw new InternalServerErrorException('Failed to retrieve subscribers');
    }
  }

  @Get(':id/subscribers/export')
  @UseGuards(SubscriptionGuard)
  async exportSubscribers(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Query('format') format?: string,
    @Res({ passthrough: true }) response?: Response
  ): Promise<StreamableFile | { data: any }> {
    try {
      const connection = await this.espConnectionService.findById(id, user.id);

      const exportFormat = (format || 'csv').toLowerCase() as ExportFormat;
      if (!['csv', 'json', 'xlsx'].includes(exportFormat)) {
        throw new BadRequestException(
          'Invalid format. Must be one of: csv, json, xlsx'
        );
      }

      const subscribers = await this.subscriberService.findByEspConnection(id);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `subscribers-${connection.espType}-${timestamp}`;

      switch (exportFormat) {
        case 'csv': {
          const csvContent =
            this.subscriberExportService.exportAsCSV(subscribers);
          const buffer = Buffer.from(csvContent, 'utf-8');
          response?.set({
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}.csv"`,
          });
          return new StreamableFile(buffer);
        }
        case 'json': {
          const jsonContent =
            this.subscriberExportService.exportAsJSON(subscribers);
          const buffer = Buffer.from(jsonContent, 'utf-8');
          response?.set({
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}.json"`,
          });
          return new StreamableFile(buffer);
        }
        case 'xlsx': {
          const excelBuffer =
            await this.subscriberExportService.exportAsExcel(subscribers);
          response?.set({
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
          });
          return new StreamableFile(excelBuffer);
        }
        default:
          throw new BadRequestException('Invalid export format');
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) {
        if (error.message.includes('permission')) {
          throw new ForbiddenException(
            'You do not have permission to access this ESP connection'
          );
        }
        throw error;
      }
      throw new InternalServerErrorException('Failed to export subscribers');
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConnection(
    @Param('id') id: string,
    @CurrentUser() user: User
  ): Promise<void> {
    try {
      // Validate ESP connection exists and belongs to user
      await this.espConnectionService.findById(id, user.id);

      // Delete the connection (cascade will handle subscribers and sync history)
      await this.espConnectionService.deleteConnection(id, user.id);
    } catch (error) {
      // Handle NotFoundException from service (404)
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Handle BadRequestException (403 - ownership validation failed)
      if (error instanceof BadRequestException) {
        throw new ForbiddenException(
          'You do not have permission to delete this ESP connection'
        );
      }

      // Handle other errors as 500
      throw new InternalServerErrorException('Failed to delete ESP connection');
    }
  }
}
