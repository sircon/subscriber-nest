import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Subscriber,
  SubscriberStatus,
} from '@app/database/entities/subscriber.entity';
import { CreateSubscriberDto } from '@app/core/sync/create-subscriber.dto';

@Injectable()
export class SubscriberService {
  constructor(
    @InjectRepository(Subscriber)
    private subscriberRepository: Repository<Subscriber>
  ) {}

  async findByEspConnection(espConnectionId: string): Promise<Subscriber[]> {
    return this.subscriberRepository.find({
      where: { espConnectionId },
      order: { createdAt: 'DESC' },
    });
  }

  async upsertSubscriber(data: CreateSubscriberDto): Promise<Subscriber> {
    const existing = await this.subscriberRepository.findOne({
      where: {
        externalId: data.externalId,
        espConnectionId: data.espConnectionId,
      },
    });

    if (existing) {
      Object.assign(existing, data);
      return this.subscriberRepository.save(existing);
    } else {
      const subscriber = this.subscriberRepository.create(data);
      return this.subscriberRepository.save(subscriber);
    }
  }

  async findByEspConnectionPaginated(
    espConnectionId: string,
    page: number = 1,
    limit: number = 50,
    status?: string
  ): Promise<{
    data: Omit<Subscriber, 'encryptedEmail'>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: any = { espConnectionId };
    if (status) {
      where.status = status;
    }

    const total = await this.subscriberRepository.count({ where });
    const offset = (page - 1) * limit;

    const subscribers = await this.subscriberRepository.find({
      where,
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    const data = subscribers.map((subscriber) => {
      const { encryptedEmail, ...subscriberData } = subscriber;
      return subscriberData;
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getConnectionStats(espConnectionId: string): Promise<{
    active: number;
    unsubscribed: number;
    total: number;
  }> {
    const [active, unsubscribed, total] = await Promise.all([
      this.subscriberRepository.count({
        where: { espConnectionId, status: SubscriberStatus.ACTIVE },
      }),
      this.subscriberRepository.count({
        where: { espConnectionId, status: SubscriberStatus.UNSUBSCRIBED },
      }),
      this.subscriberRepository.count({ where: { espConnectionId } }),
    ]);

    return { active, unsubscribed, total };
  }
}
