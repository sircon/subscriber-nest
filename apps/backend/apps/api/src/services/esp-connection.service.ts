import { EncryptionService } from '@app/core/encryption/encryption.service';
import { BeehiivConnector } from '@app/core/esp/beehiiv.connector';
import { IEspConnector } from '@app/core/esp/esp-connector.interface';
import {
  EspConnection,
  EspConnectionStatus,
  EspSyncStatus,
  EspType,
} from '@app/database/entities/esp-connection.entity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class EspConnectionService {
  constructor(
    @InjectRepository(EspConnection)
    private espConnectionRepository: Repository<EspConnection>,
    private encryptionService: EncryptionService,
    private beehiivConnector: BeehiivConnector
  ) {}

  private getConnector(espType: EspType): IEspConnector {
    switch (espType) {
      case EspType.BEEHIIV:
        return this.beehiivConnector;
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

    const espConnection = this.espConnectionRepository.create({
      userId,
      espType: espTypeEnum,
      encryptedApiKey,
      publicationId,
      status: EspConnectionStatus.ACTIVE,
      lastValidatedAt: new Date(),
    });

    return this.espConnectionRepository.save(espConnection);
  }

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

    // Decrypt the API key
    const apiKey = this.encryptionService.decrypt(connection.encryptedApiKey);

    // Get the appropriate connector
    const connector = this.getConnector(connection.espType);

    // Get subscriber count from the ESP API
    return connector.getSubscriberCount(apiKey, connection.publicationId);
  }
}
