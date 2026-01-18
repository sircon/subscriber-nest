import {
  Controller,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscriber, User } from '@subscriber-nest/shared/entities';
import { EncryptionService } from '@subscriber-nest/shared/services';
import { AuthGuard } from '../guards/auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@Controller('subscribers')
@UseGuards(AuthGuard)
export class SubscriberController {
  constructor(
    @InjectRepository(Subscriber)
    private readonly subscriberRepository: Repository<Subscriber>,
    private readonly encryptionService: EncryptionService
  ) {}

  @Post(':id/unmask')
  @HttpCode(HttpStatus.OK)
  async unmaskEmail(
    @Param('id') id: string,
    @CurrentUser() user: User
  ): Promise<{ email: string }> {
    try {
      // Find subscriber with espConnection relation to validate ownership
      const subscriber = await this.subscriberRepository.findOne({
        where: { id },
        relations: ['espConnection'],
      });

      // Check if subscriber exists
      if (!subscriber) {
        throw new NotFoundException('Subscriber not found');
      }

      // Validate that the subscriber's ESP connection belongs to the requesting user
      if (subscriber.espConnection.userId !== user.id) {
        throw new ForbiddenException(
          'You do not have permission to access this subscriber'
        );
      }

      // Decrypt the email using EncryptionService
      const decryptedEmail = this.encryptionService.decrypt(
        subscriber.encryptedEmail
      );

      return { email: decryptedEmail };
    } catch (error) {
      // Re-throw NotFoundException and ForbiddenException
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      // Handle decryption errors or other unexpected errors as 500
      throw new InternalServerErrorException(
        'Failed to unmask subscriber email'
      );
    }
  }
}
