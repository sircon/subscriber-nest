import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { EspConnection } from './esp-connection.entity';
import { BillingSubscription } from './billing-subscription.entity';
import { BillingUsage } from './billing-usage.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: false })
  isOnboarded: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deleteRequestedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => EspConnection, (espConnection) => espConnection.user)
  espConnections: EspConnection[];

  @OneToOne(
    () => BillingSubscription,
    (billingSubscription) => billingSubscription.user
  )
  billingSubscription: BillingSubscription;

  @OneToMany(() => BillingUsage, (billingUsage) => billingUsage.user)
  billingUsage: BillingUsage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
