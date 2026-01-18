import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { ScheduleModule } from "@nestjs/schedule";
import { EventEmitterModule } from "@nestjs/event-emitter";
import {
  Subscriber,
  EspConnection,
  VerificationCode,
  User,
  Session,
  SyncHistory,
  BillingSubscription,
  BillingUsage,
} from "@subscriber-nest/shared/entities";
import { EncryptionService } from "@subscriber-nest/shared/services";
import { BeehiivConnector } from "./connectors/beehiiv.connector";
import { SubscriberSyncProcessor } from "./processors/subscriber-sync.processor";
import { BillingProcessor } from "./processors/billing.processor";
import { AccountDeletionProcessor } from "./processors/account-deletion.processor";
import { SubscriberSyncService } from "./services/subscriber-sync.service";
import { SubscriberMapperService } from "./services/subscriber-mapper.service";
import { SyncHistoryService } from "./services/sync-history.service";
import { SubscriberService } from "./services/subscriber.service";
import { BillingUsageService } from "./services/billing-usage.service";
import { BillingSubscriptionService } from "./services/billing-subscription.service";
import { StripeService } from "./services/stripe.service";
import { BillingCalculationService } from "./services/billing-calculation.service";
import { EspConnectionService } from "./services/esp-connection.service";
import { SyncEventListenerService } from "./services/sync-event-listener.service";
import { SyncSchedulerService } from "./services/sync-scheduler.service";
import { BillingSchedulerService } from "./services/billing-scheduler.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DATABASE_HOST ?? "localhost",
      port: parseInt(process.env.DATABASE_PORT ?? "5432", 10),
      username: process.env.DATABASE_USER ?? "postgres",
      password: process.env.DATABASE_PASSWORD ?? "postgres",
      database: process.env.DATABASE_NAME ?? "subscriber_nest",
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== "production",
    }),
    TypeOrmModule.forFeature([
      Subscriber,
      EspConnection,
      VerificationCode,
      User,
      Session,
      SyncHistory,
      BillingSubscription,
      BillingUsage,
    ]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? "localhost",
        port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    BullModule.registerQueue({
      name: "subscriber-sync",
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    }),
    BullModule.registerQueue({
      name: "billing",
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    }),
    BullModule.registerQueue({
      name: "account-deletion",
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    }),
  ],
  providers: [
    EncryptionService,
    BeehiivConnector,
    SubscriberSyncProcessor,
    BillingProcessor,
    AccountDeletionProcessor,
    SubscriberSyncService,
    SubscriberMapperService,
    SyncHistoryService,
    SubscriberService,
    BillingUsageService,
    BillingSubscriptionService,
    StripeService,
    BillingCalculationService,
    EspConnectionService,
    SyncEventListenerService,
    SyncSchedulerService,
    BillingSchedulerService,
  ],
})
export class AppModule {}
