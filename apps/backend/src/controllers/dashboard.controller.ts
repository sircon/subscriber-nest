import {
  Controller,
  Get,
  UseGuards,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EspConnection } from '../entities/esp-connection.entity';
import { Subscriber } from '../entities/subscriber.entity';
import { SyncHistory } from '../entities/sync-history.entity';
import { AuthGuard } from '../guards/auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(
    @InjectRepository(EspConnection)
    private readonly espConnectionRepository: Repository<EspConnection>,
    @InjectRepository(Subscriber)
    private readonly subscriberRepository: Repository<Subscriber>,
    @InjectRepository(SyncHistory)
    private readonly syncHistoryRepository: Repository<SyncHistory>,
  ) {}

  @Get('stats')
  async getDashboardStats(
    @CurrentUser() user: User,
  ): Promise<{
    totalEspConnections: number;
    totalSubscribers: number;
    lastSyncTime: Date | null;
  }> {
    try {
      // Count all active ESP connections for the user
      const totalEspConnections = await this.espConnectionRepository.count({
        where: { userId: user.id },
      });

      // Get all ESP connection IDs for the user (needed for subscriber and sync history queries)
      const userConnections = await this.espConnectionRepository.find({
        where: { userId: user.id },
        select: ['id'],
      });

      const connectionIds = userConnections.map((conn) => conn.id);

      // Count all subscribers across all user's ESP connections
      let totalSubscribers = 0;
      if (connectionIds.length > 0) {
        totalSubscribers = await this.subscriberRepository.count({
          where: connectionIds.map((id) => ({ espConnectionId: id })),
        });
      }

      // Get the most recent completedAt timestamp from sync history
      let lastSyncTime: Date | null = null;
      if (connectionIds.length > 0) {
        const mostRecentSync = await this.syncHistoryRepository.findOne({
          where: connectionIds.map((id) => ({ espConnectionId: id })),
          order: { completedAt: 'DESC' },
        });

        if (mostRecentSync && mostRecentSync.completedAt) {
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
        'Failed to retrieve dashboard statistics',
      );
    }
  }
}
