import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EspConnection, EspType, EspConnectionStatus } from '../entities/esp-connection.entity';
import { EncryptionService } from './encryption.service';
import { IEspConnector } from '../interfaces/esp-connector.interface';
import { BeehiivConnector } from '../connectors/beehiiv.connector';

@Injectable()
export class EspConnectionService {
  constructor(
    @InjectRepository(EspConnection)
    private espConnectionRepository: Repository<EspConnection>,
    private encryptionService: EncryptionService,
    private beehiivConnector: BeehiivConnector,
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
    publicationId: string,
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
      encryptedApiKey,
      publicationId,
      status: EspConnectionStatus.ACTIVE,
      lastValidatedAt: new Date(),
    });

    // Save to database
    const savedConnection = await this.espConnectionRepository.save(espConnection);

    return savedConnection;
  }
}
