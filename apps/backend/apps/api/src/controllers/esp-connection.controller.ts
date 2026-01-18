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
import { CreateEspConnectionDto } from '../dto/create-esp-connection.dto';
import { EspConnection } from '@app/database/entities/esp-connection.entity';
import { EspSyncStatus } from '@app/database/entities/esp-connection.entity';
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
    @InjectQueue('subscriber-sync')
    private readonly subscriberSyncQueue: Queue
  ) {}

  @Get()
  async listConnections(
    @CurrentUser() user: User
  ): Promise<Omit<EspConnection, 'encryptedApiKey'>[]> {
    const connections = await this.espConnectionService.findAllByUserId(user.id);
    return connections.map(({ encryptedApiKey, ...connection }) => connection);
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
      const { encryptedApiKey, ...connectionResponse } = connection;
      return connectionResponse;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
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
      const connection = await this.espConnectionService.findById(id, user.id);

      if (connection.syncStatus === EspSyncStatus.SYNCING) {
        throw new ConflictException(
          'A sync is already in progress for this ESP connection'
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
}
