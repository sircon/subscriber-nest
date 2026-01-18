import {
  Controller,
  Post,
  Get,
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
import { OAuthConfigService } from '../services/oauth-config.service';
import { EncryptionService } from '../services/encryption.service';
import { CreateEspConnectionDto } from '../dto/create-esp-connection.dto';
import {
  EspConnection,
  EspSyncStatus,
  EspType,
  EspConnectionStatus,
  AuthMethod,
} from '../entities/esp-connection.entity';
import { SyncHistory } from '../entities/sync-history.entity';
import { Subscriber } from '../entities/subscriber.entity';
import { AuthGuard } from '../guards/auth.guard';
import { SubscriptionGuard } from '../guards/subscription.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../entities/user.entity';

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
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRepository(EspConnection)
    private readonly espConnectionRepository: Repository<EspConnection>,
    @InjectQueue('subscriber-sync')
    private readonly subscriberSyncQueue: Queue
  ) {}

  @Get()
  async listConnections(
    @CurrentUser() user: User
  ): Promise<Omit<EspConnection, 'encryptedApiKey'>[]> {
    const connections = await this.espConnectionService.findAllByUserId(
      user.id
    );
    return connections.map(({ encryptedApiKey, ...connection }) => connection);
  }

  @Get('oauth/initiate/:provider')
  async initiateOAuth(
    @Param('provider') provider: string,
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

      // Create OAuth state
      const state = await this.oauthStateService.createState(
        user.id,
        espType,
        redirectUri
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

      const { userId, redirectUri } = stateValidation;

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
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + expiresIn);

      // Encrypt tokens
      const encryptedAccessToken = this.encryptionService.encrypt(
        tokenResponse.access_token
      );
      const encryptedRefreshToken = tokenResponse.refresh_token
        ? this.encryptionService.encrypt(tokenResponse.refresh_token)
        : null;

      // Store connection (basic implementation - will be refined in US-012)
      // For now, we'll create a connection with OAuth tokens
      // Note: This is a temporary implementation until US-012 creates createOAuthConnection method
      const connection = this.espConnectionRepository.create({
        userId,
        espType,
        authMethod: AuthMethod.OAUTH,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt,
        status: EspConnectionStatus.ACTIVE,
        lastValidatedAt: new Date(),
      });

      const savedConnection =
        await this.espConnectionRepository.save(connection);

      // Delete OAuth state after successful use
      await this.oauthStateService.deleteState(state);

      // Get frontend URL for redirect
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';

      // Redirect to frontend success page
      const successUrl = `${frontendUrl}/esp-connections/${savedConnection.id}?oauth=success`;
      res.redirect(successUrl);
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
      // Find connection and validate ownership
      const connection = await this.espConnectionService.findById(id, user.id);

      // Return connection without encrypted API key
      const { encryptedApiKey, ...connectionResponse } = connection;
      return connectionResponse;
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
        'Failed to retrieve ESP connection'
      );
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
        createEspConnectionDto.apiKey,
        createEspConnectionDto.publicationId
      );

      // Return connection without encrypted API key
      const { encryptedApiKey, ...connectionResponse } = connection;
      return connectionResponse;
    } catch (error) {
      // Handle BadRequestException from service (400)
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Handle other errors as 500
      throw new InternalServerErrorException('Failed to create ESP connection');
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
      // Validate ESP connection exists and belongs to user
      const connection = await this.espConnectionService.findById(id, user.id);

      // Check if connection is already syncing
      if (connection.syncStatus === EspSyncStatus.SYNCING) {
        throw new ConflictException(
          'A sync is already in progress for this ESP connection'
        );
      }

      // Mark connection as syncing before adding to queue
      const updatedConnection =
        await this.espConnectionService.updateSyncStatus(
          id,
          EspSyncStatus.SYNCING
        );

      // Add job to queue
      const job = await this.subscriberSyncQueue.add('sync-publication', {
        espConnectionId: id,
      });

      // Return response with updated connection (without encrypted API key)
      const { encryptedApiKey, ...connectionResponse } = updatedConnection;
      return {
        jobId: job.id!,
        status: 'queued',
        message: 'Sync job has been queued successfully',
        connection: connectionResponse,
      };
    } catch (error) {
      // Handle NotFoundException from service (404)
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Handle BadRequestException (403 - ownership validation failed)
      if (error instanceof BadRequestException) {
        throw new ForbiddenException(
          'You do not have permission to sync this ESP connection'
        );
      }

      // Handle ConflictException (409 - sync already in progress)
      if (error instanceof ConflictException) {
        throw error;
      }

      // Handle other errors as 500
      throw new InternalServerErrorException(
        'Failed to trigger subscriber sync'
      );
    }
  }

  @Get(':id/sync-history')
  async getSyncHistory(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Query('limit') limit?: string
  ): Promise<Omit<SyncHistory, 'espConnection'>[]> {
    try {
      // Validate ESP connection exists and belongs to user
      await this.espConnectionService.findById(id, user.id);

      // Parse limit parameter (default: 50)
      const parsedLimit = limit ? parseInt(limit, 10) : 50;

      // Fetch sync history records
      const syncHistory = await this.syncHistoryService.findByEspConnection(
        id,
        parsedLimit
      );

      // Remove espConnection relation to avoid exposing sensitive data
      return syncHistory.map((record) => {
        const { espConnection, ...syncHistoryRecord } = record;
        return syncHistoryRecord;
      });
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
      // Validate ESP connection exists and belongs to user
      await this.espConnectionService.findById(id, user.id);

      // Parse pagination parameters (defaults: page=1, limit=50)
      const parsedPage = page ? parseInt(page, 10) : 1;
      const parsedLimit = limit ? parseInt(limit, 10) : 50;

      // Fetch paginated subscribers
      const result = await this.subscriberService.findByEspConnectionPaginated(
        id,
        parsedPage,
        parsedLimit,
        status
      );

      return result;
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
      // Validate ESP connection exists and belongs to user
      const connection = await this.espConnectionService.findById(id, user.id);

      // Validate format parameter
      const exportFormat = (format || 'csv').toLowerCase() as ExportFormat;
      if (!['csv', 'json', 'xlsx'].includes(exportFormat)) {
        throw new BadRequestException(
          'Invalid format. Must be one of: csv, json, xlsx'
        );
      }

      // Fetch all subscribers for the connection (no pagination)
      const subscribers = await this.subscriberService.findByEspConnection(id);

      // Generate timestamp for filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `subscribers-${connection.espType}-${timestamp}`;

      // Export based on format
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
      // Handle NotFoundException from service (404)
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Handle BadRequestException (403 - ownership validation failed, or invalid format)
      if (error instanceof BadRequestException) {
        // Check if it's an ownership error
        if (error.message.includes('permission')) {
          throw new ForbiddenException(
            'You do not have permission to access this ESP connection'
          );
        }
        // Otherwise, it's a format validation error
        throw error;
      }

      // Handle other errors as 500
      throw new InternalServerErrorException('Failed to export subscribers');
    }
  }
}
