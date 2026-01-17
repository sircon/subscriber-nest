import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Subscriber } from './subscriber.entity';

export enum EspType {
  BEEHIIV = 'beehiiv',
}

export enum EspConnectionStatus {
  ACTIVE = 'active',
  INVALID = 'invalid',
  ERROR = 'error',
}

@Entity('esp_connections')
export class EspConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: EspType,
  })
  espType: EspType;

  @Column({ type: 'text' })
  encryptedApiKey: string;

  @Column({ type: 'varchar', length: 255 })
  publicationId: string;

  @Column({
    type: 'enum',
    enum: EspConnectionStatus,
    default: EspConnectionStatus.ACTIVE,
  })
  status: EspConnectionStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastValidatedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Subscriber, (subscriber) => subscriber.espConnection)
  subscribers: Subscriber[];
}
