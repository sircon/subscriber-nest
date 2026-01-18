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
import { EspConnectionService } from '../services/esp-connection.service';
import { SyncHistoryService } from '../services/sync-history.service';
import { SubscriberService } from '../services/subscriber.service';
import {
  SubscriberExportService,
  ExportFormat,
} from '../services/subscriber-export.service';
import { CreateEspConnectionDto } from '@subscriber-nest/shared/dto';
import {
  EspConnection,
  EspSyncStatus,
  SyncHistory,
  Subscriber,
  User,
} from '@subscriber-nest/shared/entities';
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
