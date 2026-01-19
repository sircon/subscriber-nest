import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingSubscription } from './entities/billing-subscription.entity';
import { BillingUsage } from './entities/billing-usage.entity';
import { EspConnection } from './entities/esp-connection.entity';
import { Session } from './entities/session.entity';
import { Subscriber } from './entities/subscriber.entity';
import { SyncHistory } from './entities/sync-history.entity';
import { User } from './entities/user.entity';
import { VerificationCode } from './entities/verification-code.entity';

const entities = [
  BillingSubscription,
  BillingUsage,
  EspConnection,
  Session,
  Subscriber,
  SyncHistory,
  User,
  VerificationCode,
];

@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
