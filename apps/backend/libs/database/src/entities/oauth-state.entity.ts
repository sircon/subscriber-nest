import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { EspType } from './esp-connection.entity';

@Entity('oauth_states')
@Index(['state'], { unique: true })
@Index(['userId', 'espType'])
export class OAuthState {
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

  @Column({ type: 'varchar', length: 255, unique: true })
  state: string;

  @Column({ type: 'text', nullable: true })
  redirectUri: string | null;

  @Column({ type: 'boolean', default: false })
  isOnboarding: boolean;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
