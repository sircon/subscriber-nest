import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum BillingUsageStatus {
  PENDING = 'pending',
  INVOICED = 'invoiced',
  PAID = 'paid',
  FAILED = 'failed',
}

@Entity('billing_usage')
@Index(['userId', 'billingPeriodStart'], { unique: true })
export class BillingUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'timestamp' })
  billingPeriodStart: Date;

  @Column({ type: 'timestamp' })
  billingPeriodEnd: Date;

  @Column({ type: 'integer' })
  maxSubscriberCount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  calculatedAmount: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeInvoiceId: string | null;

  @Column({
    type: 'enum',
    enum: BillingUsageStatus,
  })
  status: BillingUsageStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
