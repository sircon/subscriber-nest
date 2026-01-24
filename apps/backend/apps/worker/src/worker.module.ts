import { BillingModule } from '@app/core/billing/billing.module';
import { EncryptionModule } from '@app/core/encryption/encryption.module';
import { OAuthModule } from '@app/core/oauth/oauth.module';
import { SyncModule } from '@app/core/sync/sync.module';
import { DatabaseModule } from '@app/database/database.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountDeletionProcessor } from './processors/account-deletion.processor';
import { BillingProcessor } from './processors/billing.processor';
import { OAuthStateCleanupProcessor } from './processors/oauth-state-cleanup.processor';
import { OAuthTokenRefreshProcessor } from './processors/oauth-token-refresh.processor';
import { NightlySyncProcessor } from './processors/nightly-sync.processor';
import { SubscriberSyncProcessor } from './processors/subscriber-sync.processor';
import { AccountDeletionSchedulerService } from './schedulers/account-deletion-scheduler.service';
import { BillingSchedulerService } from './schedulers/billing-scheduler.service';
import { NightlySyncSchedulerService } from './schedulers/nightly-sync-scheduler.service';
import { OAuthStateSchedulerService } from './schedulers/oauth-state-scheduler.service';
import { OAuthTokenRefreshSchedulerService } from './schedulers/oauth-token-refresh-scheduler.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
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
      synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
    }),
    DatabaseModule,
    EncryptionModule,
    SyncModule,
    OAuthModule,
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
      },
      {
        name: 'oauth-state-cleanup',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      },
      {
        name: 'oauth-token-refresh',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      },
      {
        name: 'sync-scheduler',
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
    OAuthStateCleanupProcessor,
    OAuthTokenRefreshProcessor,
    NightlySyncProcessor,
    BillingSchedulerService,
    AccountDeletionSchedulerService,
    OAuthStateSchedulerService,
    OAuthTokenRefreshSchedulerService,
    NightlySyncSchedulerService,
  ],
})
export class WorkerModule { }
