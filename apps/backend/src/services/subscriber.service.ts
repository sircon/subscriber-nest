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

  /**
   * Find subscribers by ESP connection with pagination and optional status filter
   * @param espConnectionId - The ID of the ESP connection
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 50)
   * @param status - Optional status filter
   * @returns Object with paginated subscriber data and metadata
   */
  async findByEspConnectionPaginated(
    espConnectionId: string,
    page: number = 1,
    limit: number = 50,
    status?: string,
  ): Promise<{
    data: Omit<Subscriber, 'encryptedEmail'>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Build query filters
    const where: any = { espConnectionId };
    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await this.subscriberRepository.count({ where });

    // Calculate offset
    const offset = (page - 1) * limit;

    // Fetch subscribers with pagination
    const subscribers = await this.subscriberRepository.find({
      where,
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    // Remove encryptedEmail from response
    const data = subscribers.map((subscriber) => {
      const { encryptedEmail, ...subscriberData } = subscriber;
      return subscriberData;
    });

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
