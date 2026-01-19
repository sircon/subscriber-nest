import { EncryptionService } from '@app/core/encryption/encryption.service';
import { Subscriber } from '@app/database/entities/subscriber.entity';
import { User } from '@app/database/entities/user.entity';
import {
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthGuard } from '../guards/auth.guard';

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
      const subscriber = await this.subscriberRepository.findOne({
        where: { id },
        relations: ['espConnection'],
      });

      if (!subscriber) {
        throw new NotFoundException('Subscriber not found');
      }

      if (subscriber.espConnection.userId !== user.id) {
        throw new ForbiddenException(
          'You do not have permission to access this subscriber'
        );
      }

      const decryptedEmail = this.encryptionService.decrypt(
        subscriber.encryptedEmail
      );

      return { email: decryptedEmail };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to unmask subscriber email'
      );
    }
  }
}
