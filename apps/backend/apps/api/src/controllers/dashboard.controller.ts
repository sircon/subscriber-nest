import {
  Controller,
  Get,
  UseGuards,
  InternalServerErrorException,
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
}
