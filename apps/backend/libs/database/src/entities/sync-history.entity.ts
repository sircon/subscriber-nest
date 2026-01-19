import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EspConnection } from './esp-connection.entity';

export enum SyncHistoryStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('sync_history')
export class SyncHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  espConnectionId: string;

  @ManyToOne(() => EspConnection, (espConnection) => espConnection.syncHistory)
  @JoinColumn({ name: 'espConnectionId' })
  espConnection: EspConnection;

  @Column({ type: 'varchar', length: 255, nullable: true })
  publicationId: string | null;

  @Column({
    type: 'enum',
    enum: SyncHistoryStatus,
  })
  status: SyncHistoryStatus;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'integer', nullable: true })
  subscriberCount: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
