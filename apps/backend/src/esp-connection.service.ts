import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EspConnection, EspProvider } from './entities/esp-connection.entity';
import { User } from './entities/user.entity';
import { EncryptionService } from './encryption.service';

@Injectable()
export class EspConnectionService {
  constructor(
    @InjectRepository(EspConnection)
    private espConnectionRepository: Repository<EspConnection>,
    private encryptionService: EncryptionService,
  ) {}

  async createConnection(
    user: User,
    provider: string,
    apiKey: string,
  ): Promise<{ id: string; provider: EspProvider; createdAt: Date }> {
    // Validate provider is in allowed list
    if (!Object.values(EspProvider).includes(provider as EspProvider)) {
      throw new BadRequestException(
        `Invalid provider. Allowed providers: ${Object.values(EspProvider).join(', ')}`,
      );
    }

    // Encrypt API key
    const encryptedApiKey = this.encryptionService.encrypt(apiKey);

    // Create ESP connection
    const espConnection = this.espConnectionRepository.create({
      userId: user.id,
      provider: provider as EspProvider,
      apiKey: encryptedApiKey,
      isActive: true,
    });

    const saved = await this.espConnectionRepository.save(espConnection);

    // Return without API key
    return {
      id: saved.id,
      provider: saved.provider,
      createdAt: saved.createdAt,
    };
  }
}
