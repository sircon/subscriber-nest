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

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: false })
  isOnboarded: boolean;

  @OneToMany(() => EspConnection, (espConnection) => espConnection.user)
  espConnections: EspConnection[];

  @OneToOne(() => BillingSubscription, (billingSubscription) => billingSubscription.user)
  billingSubscription: BillingSubscription;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
