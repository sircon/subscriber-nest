import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriberCountToSyncHistory1768743569622 implements MigrationInterface {
  name = 'AddSubscriberCountToSyncHistory1768743569622';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sync_history" ADD "subscriberCount" integer`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sync_history" DROP COLUMN "subscriberCount"`
    );
  }
}
