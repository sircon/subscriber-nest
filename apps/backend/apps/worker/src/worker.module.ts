import { BillingModule } from '@app/core/billing/billing.module';
import { EncryptionModule } from '@app/core/encryption/encryption.module';
import { SyncModule } from '@app/core/sync/sync.module';
import { DatabaseModule } from '@app/database/database.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountDeletionProcessor } from './processors/account-deletion.processor';
import { BillingProcessor } from './processors/billing.processor';
import { SubscriberSyncProcessor } from './processors/subscriber-sync.processor';
import { AccountDeletionSchedulerService } from './schedulers/account-deletion-scheduler.service';
import { BillingSchedulerService } from './schedulers/billing-scheduler.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
      username: process.env.DATABASE_USER ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'postgres',
      database: process.env.DATABASE_NAME ?? 'subscriber_nest',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    DatabaseModule,
    EncryptionModule,
    SyncModule,
    BillingModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    BullModule.registerQueue(
      {
        name: 'subscriber-sync',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      },
      {
        name: 'billing',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      },
      {
        name: 'account-deletion',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      }
    ),
  ],
  providers: [
    SubscriberSyncProcessor,
    BillingProcessor,
    AccountDeletionProcessor,
    BillingSchedulerService,
    AccountDeletionSchedulerService,
  ],
})
export class WorkerModule {}
