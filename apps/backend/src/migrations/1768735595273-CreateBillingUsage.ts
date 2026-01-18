import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBillingUsage1768735595273 implements MigrationInterface {
    name = 'CreateBillingUsage1768735595273'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."billing_usage_status_enum" AS ENUM('pending', 'invoiced', 'paid', 'failed')`);
        await queryRunner.query(`CREATE TABLE "billing_usage" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "billingPeriodStart" TIMESTAMP NOT NULL, "billingPeriodEnd" TIMESTAMP NOT NULL, "maxSubscriberCount" integer NOT NULL, "calculatedAmount" numeric(10,2) NOT NULL, "stripeInvoiceId" character varying(255), "status" "public"."billing_usage_status_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_55b77cbbebecd847e5c71420846" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3f3a655e6318ef5bbfa9c9cc96" ON "billing_usage" ("userId", "billingPeriodStart") `);
        await queryRunner.query(`ALTER TABLE "billing_usage" ADD CONSTRAINT "FK_061d6568c34dc6403de70458531" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "billing_usage" DROP CONSTRAINT "FK_061d6568c34dc6403de70458531"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3f3a655e6318ef5bbfa9c9cc96"`);
        await queryRunner.query(`DROP TABLE "billing_usage"`);
        await queryRunner.query(`DROP TYPE "public"."billing_usage_status_enum"`);
    }

}
