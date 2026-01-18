import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripeSubscriptionItemId1768743851825 implements MigrationInterface {
  name = 'AddStripeSubscriptionItemId1768743851825';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_subscriptions' AND column_name = 'stripeSubscriptionItemId') THEN ALTER TABLE "billing_subscriptions" ADD "stripeSubscriptionItemId" character varying(255); END IF; END $$;`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "billing_subscriptions" DROP COLUMN "stripeSubscriptionItemId"`
    );
  }
}
