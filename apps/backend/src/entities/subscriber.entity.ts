import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EspConnection } from './esp-connection.entity';

export enum SubscriberStatus {
  ACTIVE = 'active',
  UNSUBSCRIBED = 'unsubscribed',
  BOUNCED = 'bounced',
}

@Entity('subscribers')
@Index(['espConnectionId', 'externalId'], { unique: true })
export class Subscriber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  espConnectionId: string;

  @ManyToOne(() => EspConnection, (espConnection) => espConnection.subscribers)
  @JoinColumn({ name: 'espConnectionId' })
  espConnection: EspConnection;

  @Column({ type: 'varchar', length: 255 })
  externalId: string;

  @Column({ type: 'text' })
  encryptedEmail: string;

  @Column({ type: 'varchar', length: 255 })
  maskedEmail: string;

  @Column({
    type: 'enum',
    enum: SubscriberStatus,
    default: SubscriberStatus.ACTIVE,
  })
  status: SubscriberStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lastName: string | null;

  @Column({ type: 'timestamp', nullable: true })
  subscribedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  unsubscribedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
