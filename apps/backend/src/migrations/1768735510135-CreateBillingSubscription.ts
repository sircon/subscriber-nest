import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBillingSubscription1768735510135 implements MigrationInterface {
    name = 'CreateBillingSubscription1768735510135'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DO $$ BEGIN CREATE TYPE "public"."billing_subscriptions_status_enum" AS ENUM('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "billing_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "stripeCustomerId" character varying(255) NOT NULL, "stripeSubscriptionId" character varying(255), "stripePriceId" character varying(255), "status" "public"."billing_subscriptions_status_enum" NOT NULL, "currentPeriodStart" TIMESTAMP, "currentPeriodEnd" TIMESTAMP, "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false, "canceledAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_59e19bfbcc389793e1beee1b840" UNIQUE ("userId"), CONSTRAINT "UQ_bc1ae98d43dd969bd9b47b51a00" UNIQUE ("stripeCustomerId"), CONSTRAINT "UQ_44a362181c5bdbc13fbc16a4df7" UNIQUE ("stripeSubscriptionId"), CONSTRAINT "REL_59e19bfbcc389793e1beee1b84" UNIQUE ("userId"), CONSTRAINT "PK_da12bd094f95ed1a9ad21b0b2df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_59e19bfbcc389793e1beee1b840') THEN ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "FK_59e19bfbcc389793e1beee1b840" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; END IF; END $$;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "billing_subscriptions" DROP CONSTRAINT "FK_59e19bfbcc389793e1beee1b840"`);
        await queryRunner.query(`DROP TABLE "billing_subscriptions"`);
        await queryRunner.query(`DROP TYPE "public"."billing_subscriptions_status_enum"`);
    }

}
