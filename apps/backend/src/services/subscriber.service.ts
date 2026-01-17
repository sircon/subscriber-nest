import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscriber } from '../entities/subscriber.entity';
import { CreateSubscriberDto } from '../dto/create-subscriber.dto';

@Injectable()
export class SubscriberService {
  constructor(
    @InjectRepository(Subscriber)
    private subscriberRepository: Repository<Subscriber>,
  ) {}

  /**
   * Find all subscribers for a given ESP connection
   * @param espConnectionId - The ID of the ESP connection
   * @returns Array of subscribers for the connection
   */
  async findByEspConnection(espConnectionId: string): Promise<Subscriber[]> {
    return this.subscriberRepository.find({
      where: { espConnectionId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Upsert a subscriber (create if not exists, update if exists)
   * Uses externalId + espConnectionId as unique key
   * @param data - Subscriber data to create or update
   * @returns The created or updated subscriber
   */
  async upsertSubscriber(data: CreateSubscriberDto): Promise<Subscriber> {
    // Try to find existing subscriber by unique key (externalId + espConnectionId)
    const existing = await this.subscriberRepository.findOne({
      where: {
        externalId: data.externalId,
        espConnectionId: data.espConnectionId,
      },
    });

    if (existing) {
      // Update existing subscriber
      Object.assign(existing, data);
      return this.subscriberRepository.save(existing);
    } else {
      // Create new subscriber
      const subscriber = this.subscriberRepository.create(data);
      return this.subscriberRepository.save(subscriber);
    }
  }
}
