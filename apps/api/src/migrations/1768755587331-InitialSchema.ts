import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1768755587331 implements MigrationInterface {
    name = 'InitialSchema1768755587331'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enums with idempotent checks
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."subscribers_status_enum" AS ENUM('active', 'unsubscribed', 'bounced');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."sync_history_status_enum" AS ENUM('success', 'failed');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."esp_connections_esptype_enum" AS ENUM('beehiiv', 'kit', 'mailchimp');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."esp_connections_status_enum" AS ENUM('active', 'invalid', 'error');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."esp_connections_syncstatus_enum" AS ENUM('idle', 'syncing', 'synced', 'error');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."billing_usage_status_enum" AS ENUM('pending', 'invoiced', 'paid', 'failed');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."billing_subscriptions_status_enum" AS ENUM('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);

        // Create tables with IF NOT EXISTS
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "isOnboarded" boolean NOT NULL DEFAULT false, "deleteRequestedAt" TIMESTAMP, "deletedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "esp_connections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "espType" "public"."esp_connections_esptype_enum" NOT NULL, "encryptedApiKey" text NOT NULL, "publicationId" character varying(255) NOT NULL, "status" "public"."esp_connections_status_enum" NOT NULL DEFAULT 'active', "syncStatus" "public"."esp_connections_syncstatus_enum" NOT NULL DEFAULT 'idle', "lastValidatedAt" TIMESTAMP, "lastSyncedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9451247a4a59ee8b02559405417" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "subscribers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "espConnectionId" uuid NOT NULL, "externalId" character varying(255) NOT NULL, "encryptedEmail" text NOT NULL, "maskedEmail" character varying(255) NOT NULL, "status" "public"."subscribers_status_enum" NOT NULL DEFAULT 'active', "firstName" character varying(255), "lastName" character varying(255), "subscribedAt" TIMESTAMP, "unsubscribedAt" TIMESTAMP, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cbe0a7a9256c826f403c0236b67" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "sync_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "espConnectionId" uuid NOT NULL, "status" "public"."sync_history_status_enum" NOT NULL, "startedAt" TIMESTAMP NOT NULL, "completedAt" TIMESTAMP, "errorMessage" text, "subscriberCount" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e929aeba0c2244394dab3a7514c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "billing_usage" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "billingPeriodStart" TIMESTAMP NOT NULL, "billingPeriodEnd" TIMESTAMP NOT NULL, "maxSubscriberCount" integer NOT NULL, "calculatedAmount" numeric(10,2) NOT NULL, "stripeInvoiceId" character varying(255), "status" "public"."billing_usage_status_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_55b77cbbebecd847e5c71420846" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "billing_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "stripeCustomerId" character varying(255) NOT NULL, "stripeSubscriptionId" character varying(255), "stripePriceId" character varying(255), "stripeSubscriptionItemId" character varying(255), "status" "public"."billing_subscriptions_status_enum" NOT NULL, "currentPeriodStart" TIMESTAMP, "currentPeriodEnd" TIMESTAMP, "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false, "canceledAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_59e19bfbcc389793e1beee1b840" UNIQUE ("userId"), CONSTRAINT "UQ_bc1ae98d43dd969bd9b47b51a00" UNIQUE ("stripeCustomerId"), CONSTRAINT "UQ_44a362181c5bdbc13fbc16a4df7" UNIQUE ("stripeSubscriptionId"), CONSTRAINT "REL_59e19bfbcc389793e1beee1b84" UNIQUE ("userId"), CONSTRAINT "PK_da12bd094f95ed1a9ad21b0b2df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "token" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e9f62f5dcb8a54b84234c9e7a06" UNIQUE ("token"), CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "verification_codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "code" character varying(6) NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "used" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_18741b6b8bf1680dbf5057421d7" PRIMARY KEY ("id"))`);

        // Create indexes with IF NOT EXISTS
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_3731b3ff162b853aa6480fd99a" ON "subscribers" ("espConnectionId", "externalId")`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_3f3a655e6318ef5bbfa9c9cc96" ON "billing_usage" ("userId", "billingPeriodStart")`);
        // Add foreign key constraints with idempotent checks
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_0bb4358ffdcc6d5a0f207e11867') THEN
                    ALTER TABLE "subscribers" ADD CONSTRAINT "FK_0bb4358ffdcc6d5a0f207e11867" FOREIGN KEY ("espConnectionId") REFERENCES "esp_connections"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_b29cb61aa432177f31e285ea616') THEN
                    ALTER TABLE "sync_history" ADD CONSTRAINT "FK_b29cb61aa432177f31e285ea616" FOREIGN KEY ("espConnectionId") REFERENCES "esp_connections"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_2a11e9755aa939e01b2d59c96d5') THEN
                    ALTER TABLE "esp_connections" ADD CONSTRAINT "FK_2a11e9755aa939e01b2d59c96d5" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_061d6568c34dc6403de70458531') THEN
                    ALTER TABLE "billing_usage" ADD CONSTRAINT "FK_061d6568c34dc6403de70458531" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_59e19bfbcc389793e1beee1b840') THEN
                    ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "FK_59e19bfbcc389793e1beee1b840" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_57de40bc620f456c7311aa3a1e6') THEN
                    ALTER TABLE "sessions" ADD CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6"`);
        await queryRunner.query(`ALTER TABLE "billing_subscriptions" DROP CONSTRAINT "FK_59e19bfbcc389793e1beee1b840"`);
        await queryRunner.query(`ALTER TABLE "billing_usage" DROP CONSTRAINT "FK_061d6568c34dc6403de70458531"`);
        await queryRunner.query(`ALTER TABLE "esp_connections" DROP CONSTRAINT "FK_2a11e9755aa939e01b2d59c96d5"`);
        await queryRunner.query(`ALTER TABLE "sync_history" DROP CONSTRAINT "FK_b29cb61aa432177f31e285ea616"`);
        await queryRunner.query(`ALTER TABLE "subscribers" DROP CONSTRAINT "FK_0bb4358ffdcc6d5a0f207e11867"`);
        await queryRunner.query(`DROP TABLE "verification_codes"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
        await queryRunner.query(`DROP TABLE "billing_subscriptions"`);
        await queryRunner.query(`DROP TYPE "public"."billing_subscriptions_status_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3f3a655e6318ef5bbfa9c9cc96"`);
        await queryRunner.query(`DROP TABLE "billing_usage"`);
        await queryRunner.query(`DROP TYPE "public"."billing_usage_status_enum"`);
        await queryRunner.query(`DROP TABLE "esp_connections"`);
        await queryRunner.query(`DROP TYPE "public"."esp_connections_syncstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."esp_connections_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."esp_connections_esptype_enum"`);
        await queryRunner.query(`DROP TABLE "sync_history"`);
        await queryRunner.query(`DROP TYPE "public"."sync_history_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3731b3ff162b853aa6480fd99a"`);
        await queryRunner.query(`DROP TABLE "subscribers"`);
        await queryRunner.query(`DROP TYPE "public"."subscribers_status_enum"`);
    }

}
