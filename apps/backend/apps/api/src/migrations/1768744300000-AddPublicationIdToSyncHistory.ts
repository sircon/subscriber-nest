import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublicationIdToSyncHistory1768744300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add publicationId column to sync_history table
    await queryRunner.query(
      `ALTER TABLE "sync_history" ADD COLUMN IF NOT EXISTS "publicationId" varchar(255) NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sync_history" DROP COLUMN IF EXISTS "publicationId"`
    );
  }
}
