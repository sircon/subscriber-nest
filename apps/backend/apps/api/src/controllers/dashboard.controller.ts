import {
  Controller,
  Get,
  InternalServerErrorException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EspConnection } from '@app/database/entities/esp-connection.entity';
import { Subscriber } from '@app/database/entities/subscriber.entity';
import { SyncHistory } from '@app/database/entities/sync-history.entity';
import { User } from '@app/database/entities/user.entity';
import { AuthGuard } from '../guards/auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(
    @InjectRepository(EspConnection)
    private readonly espConnectionRepository: Repository<EspConnection>,
    @InjectRepository(Subscriber)
    private readonly subscriberRepository: Repository<Subscriber>,
    @InjectRepository(SyncHistory)
    private readonly syncHistoryRepository: Repository<SyncHistory>
  ) {}

  @Get('stats')
  async getDashboardStats(@CurrentUser() user: User): Promise<{
    totalEspConnections: number;
    totalSubscribers: number;
    lastSyncTime: Date | null;
  }> {
    try {
      const totalEspConnections = await this.espConnectionRepository.count({
        where: { userId: user.id },
      });

      const userConnections = await this.espConnectionRepository.find({
        where: { userId: user.id },
        select: ['id'],
      });

      const connectionIds = userConnections.map((conn) => conn.id);

      let totalSubscribers = 0;
      if (connectionIds.length > 0) {
        totalSubscribers = await this.subscriberRepository.count({
          where: connectionIds.map((id) => ({ espConnectionId: id })),
        });
      }

      let lastSyncTime: Date | null = null;
      if (connectionIds.length > 0) {
        const mostRecentSync = await this.syncHistoryRepository.findOne({
          where: connectionIds.map((id) => ({ espConnectionId: id })),
          order: { completedAt: 'DESC' },
        });

        if (mostRecentSync?.completedAt) {
          lastSyncTime = mostRecentSync.completedAt;
        }
      }

      return {
        totalEspConnections,
        totalSubscribers,
        lastSyncTime,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to retrieve dashboard statistics'
      );
    }
  }

  @Get('subscribers')
  async getDashboardSubscribers(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ): Promise<{
    data: Array<
      Omit<Subscriber, 'encryptedEmail' | 'espConnection'> & {
        espType: string;
      }
    >;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const pageNumber = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);
      const limitNumber = Math.max(1, Number.parseInt(limit ?? '50', 10) || 50);
      const offset = (pageNumber - 1) * limitNumber;

      const [subscribers, total] = await this.subscriberRepository
        .createQueryBuilder('subscriber')
        .innerJoinAndSelect('subscriber.espConnection', 'connection')
        .where('connection.userId = :userId', { userId: user.id })
        .orderBy('subscriber.createdAt', 'DESC')
        .skip(offset)
        .take(limitNumber)
        .getManyAndCount();

      const data = subscribers.map((subscriber) => {
        const { encryptedEmail, espConnection, ...subscriberData } = subscriber;
        return {
          ...subscriberData,
          espType: espConnection.espType,
        };
      });

      const totalPages = Math.ceil(total / limitNumber);

      return {
        data,
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to retrieve dashboard subscribers'
      );
    }
  }
}
