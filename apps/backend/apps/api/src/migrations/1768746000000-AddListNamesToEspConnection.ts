import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddListNamesToEspConnection1768746000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add listNames column to esp_connections table
    // This stores the display names of lists/publications/segments for UI display
    // Different ESPs use different terminology (lists, segments, publications), but we store names here
    await queryRunner.query(
      `ALTER TABLE "esp_connections" ADD COLUMN IF NOT EXISTS "listNames" jsonb NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "esp_connections" DROP COLUMN IF EXISTS "listNames"`
    );
  }
}
