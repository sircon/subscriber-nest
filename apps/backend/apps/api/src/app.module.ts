import { BillingModule } from '@app/core/billing/billing.module';
import { EncryptionModule } from '@app/core/encryption/encryption.module';
import { EspModule } from '@app/core/esp/esp.module';
import { OAuthModule } from '@app/core/oauth/oauth.module';
import { DatabaseModule } from '@app/database/database.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccountController } from './controllers/account.controller';
import { BillingController } from './controllers/billing.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { EspConnectionController } from './controllers/esp-connection.controller';
import { SubscriberController } from './controllers/subscriber.controller';
import { EmailService } from './email.service';
import { AuthGuard } from './guards/auth.guard';
import { SubscriptionGuard } from './guards/subscription.guard';
import { EspConnectionService } from './services/esp-connection.service';
import { OAuthStateService } from './services/oauth-state.service';
import { SubscriberExportService } from './services/subscriber-export.service';
import { SubscriberService } from './services/subscriber.service';
import { SyncHistoryService } from './services/sync-history.service';


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
    HttpModule,
    DatabaseModule,
    EncryptionModule,
    EspModule,
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
      }
    ),
  ],
  controllers: [
    AppController,
    AuthController,
    EspConnectionController,
    SubscriberController,
    DashboardController,
    BillingController,
    AccountController,
  ],
  providers: [
    AppService,
    SubscriberService,
    SubscriberExportService,
    EspConnectionService,
    OAuthStateService,
    EmailService,
    AuthService,
    AuthGuard,
    SubscriptionGuard,
    SyncHistoryService,
  ],
  exports: [EmailService],
})
export class AppModule {}
