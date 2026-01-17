import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EspConnectionService } from '../services/esp-connection.service';
import { CreateEspConnectionDto } from '../dto/create-esp-connection.dto';
import { EspConnection } from '../entities/esp-connection.entity';

@Controller('api/esp-connections')
export class EspConnectionController {
  constructor(private readonly espConnectionService: EspConnectionService) {}

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
}
