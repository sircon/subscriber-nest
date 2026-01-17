import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EspConnectionService } from '../services/esp-connection.service';
import { CreateEspConnectionDto } from '../dto/create-esp-connection.dto';
import { EspConnection } from '../entities/esp-connection.entity';

@Controller('api/esp-connections')
export class EspConnectionController {
  constructor(
    private readonly espConnectionService: EspConnectionService,
    @InjectQueue('subscriber-sync')
    private readonly subscriberSyncQueue: Queue,
  ) {}

  @Get(':id')
  async getConnection(
    @Param('id') id: string,
  ): Promise<Omit<EspConnection, 'encryptedApiKey'>> {
    try {
      // TODO: Get userId from authentication context (currently using placeholder)
      // For now, we'll use a placeholder userId. In production, this should come from the authenticated user.
      const userId = 'placeholder-user-id';

      // Find connection and validate ownership
      const connection = await this.espConnectionService.findById(id, userId);

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
          'You do not have permission to access this ESP connection',
        );
      }

      // Handle other errors as 500
      throw new InternalServerErrorException(
        'Failed to retrieve ESP connection',
      );
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createConnection(
    @Body() createEspConnectionDto: CreateEspConnectionDto,
  ): Promise<Omit<EspConnection, 'encryptedApiKey'>> {
    try {
      // TODO: Get userId from authentication context (currently using placeholder)
      // For now, we'll use a placeholder userId. In production, this should come from the authenticated user.
      const userId = 'placeholder-user-id';

      const connection = await this.espConnectionService.createConnection(
        userId,
        createEspConnectionDto.espType,
        createEspConnectionDto.apiKey,
        createEspConnectionDto.publicationId,
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
      throw new InternalServerErrorException(
        'Failed to create ESP connection',
      );
    }
  }

  @Post(':id/sync')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerSync(@Param('id') id: string): Promise<{
    jobId: string;
    status: string;
    message: string;
  }> {
    try {
      // TODO: Get userId from authentication context (currently using placeholder)
      // For now, we'll use a placeholder userId. In production, this should come from the authenticated user.
      const userId = 'placeholder-user-id';

      // Validate ESP connection exists and belongs to user
      await this.espConnectionService.findById(id, userId);

      // Add job to queue
      const job = await this.subscriberSyncQueue.add('sync-publication', {
        espConnectionId: id,
      });

      return {
        jobId: job.id!,
        status: 'queued',
        message: 'Sync job has been queued successfully',
      };
    } catch (error) {
      // Handle NotFoundException from service (404)
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Handle BadRequestException (403 - ownership validation failed)
      if (error instanceof BadRequestException) {
        throw new ForbiddenException(
          'You do not have permission to sync this ESP connection',
        );
      }

      // Handle other errors as 500
      throw new InternalServerErrorException(
        'Failed to trigger subscriber sync',
      );
    }
  }
}
