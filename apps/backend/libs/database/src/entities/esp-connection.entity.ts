import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Subscriber } from './subscriber.entity';
import { User } from './user.entity';
import { SyncHistory } from './sync-history.entity';

export enum EspType {
  BEEHIIV = 'beehiiv',
  KIT = 'kit',
  MAILCHIMP = 'mailchimp',
}

export enum EspConnectionStatus {
  ACTIVE = 'active',
  INVALID = 'invalid',
  ERROR = 'error',
}

export enum EspSyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  ERROR = 'error',
}

@Entity('esp_connections')
export class EspConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

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

  @Column({
    type: 'enum',
    enum: EspSyncStatus,
    default: EspSyncStatus.IDLE,
  })
  syncStatus: EspSyncStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastValidatedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Subscriber, (subscriber) => subscriber.espConnection)
  subscribers: Subscriber[];

  @OneToMany(() => SyncHistory, (syncHistory) => syncHistory.espConnection)
  syncHistory: SyncHistory[];
}
