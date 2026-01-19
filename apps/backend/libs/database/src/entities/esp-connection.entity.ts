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
  CAMPAIGN_MONITOR = 'campaign_monitor',
  EMAIL_OCTOPUS = 'email_octopus',
  OMEDA = 'omeda',
  GHOST = 'ghost',
  SPARKPOST = 'sparkpost',
  ACTIVE_CAMPAIGN = 'active_campaign',
  CUSTOMER_IO = 'customer_io',
  SAILTHRU = 'sailthru',
  MAILERLITE = 'mailerlite',
  POSTUP = 'postup',
  CONSTANT_CONTACT = 'constant_contact',
  ITERABLE = 'iterable',
  SENDGRID = 'sendgrid',
  BREVO = 'brevo',
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

export enum AuthMethod {
  API_KEY = 'api_key',
  OAUTH = 'oauth',
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

  @Column({
    type: 'enum',
    enum: AuthMethod,
    default: AuthMethod.API_KEY,
  })
  authMethod: AuthMethod;

  @Column({ type: 'text', nullable: true })
  encryptedApiKey: string | null;

  @Column({ type: 'text', nullable: true })
  encryptedAccessToken: string | null;

  @Column({ type: 'text', nullable: true })
  encryptedRefreshToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  tokenExpiresAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  publicationId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  publicationIds: string[] | null;

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
