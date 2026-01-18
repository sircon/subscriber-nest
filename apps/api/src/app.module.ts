import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import { BullModule } from "@nestjs/bullmq";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { EncryptionService } from "@subscriber-nest/shared/services";
import { BeehiivConnector } from "./connectors/beehiiv.connector";
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
import { SubscriberService } from "./services/subscriber.service";
import { SubscriberExportService } from "./services/subscriber-export.service";
import { EspConnectionService } from "./services/esp-connection.service";
import { EspConnectionController } from "./controllers/esp-connection.controller";
import { SubscriberController } from "./controllers/subscriber.controller";
import { DashboardController } from "./controllers/dashboard.controller";
import { EmailService } from "./services/email.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./services/auth.service";
import { AuthGuard } from "./guards/auth.guard";
import { SubscriptionGuard } from "./guards/subscription.guard";
import { SyncHistoryService } from "./services/sync-history.service";
import { StripeService } from "./services/stripe.service";
import { BillingCalculationService } from "./services/billing-calculation.service";
import { BillingUsageService } from "./services/billing-usage.service";
import { BillingSubscriptionService } from "./services/billing-subscription.service";
import { BillingController } from "./controllers/billing.controller";
import { AccountController } from "./controllers/account.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    HttpModule,
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
    EncryptionService,
    BeehiivConnector,
    SubscriberService,
    SubscriberExportService,
    EspConnectionService,
    EmailService,
    AuthService,
    AuthGuard,
    SubscriptionGuard,
    SyncHistoryService,
    StripeService,
    BillingCalculationService,
    BillingUsageService,
    BillingSubscriptionService,
  ],
  exports: [EmailService],
})
export class AppModule {}
