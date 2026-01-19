import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncHistory } from '@app/database/entities/sync-history.entity';

@Injectable()
export class SyncHistoryService {
  constructor(
    @InjectRepository(SyncHistory)
    private syncHistoryRepository: Repository<SyncHistory>
  ) {}

  async findByEspConnection(
    espConnectionId: string,
    limit: number = 50
  ): Promise<SyncHistory[]> {
    return this.syncHistoryRepository.find({
      where: { espConnectionId },
      relations: ['espConnection'],
      order: { startedAt: 'DESC' },
      take: limit,
    });
  }
}
