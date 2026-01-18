import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncHistory } from '../entities/sync-history.entity';

@Injectable()
export class SyncHistoryService {
  constructor(
    @InjectRepository(SyncHistory)
    private syncHistoryRepository: Repository<SyncHistory>,
  ) {}

  /**
   * Finds sync history records for a specific ESP connection
   * @param espConnectionId - The ID of the ESP connection
   * @param limit - Maximum number of records to return (default: 50)
   * @returns Array of sync history records ordered by startedAt DESC
   */
  async findByEspConnection(
    espConnectionId: string,
    limit: number = 50,
  ): Promise<SyncHistory[]> {
    return this.syncHistoryRepository.find({
      where: { espConnectionId },
      relations: ['espConnection'],
      order: { startedAt: 'DESC' },
      take: limit,
    });
  }
}
