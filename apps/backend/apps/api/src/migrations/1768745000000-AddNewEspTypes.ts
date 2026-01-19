import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewEspTypes1768745000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new ESP types to the esp_type_enum
    // Using IF NOT EXISTS to make migration idempotent
    await queryRunner.query(`
      ALTER TYPE "esp_type_enum" ADD VALUE IF NOT EXISTS 'campaign_monitor';
    `);
    await queryRunner.query(`
      ALTER TYPE "esp_type_enum" ADD VALUE IF NOT EXISTS 'email_octopus';
    `);
    await queryRunner.query(`
      ALTER TYPE "esp_type_enum" ADD VALUE IF NOT EXISTS 'omeda';
    `);
    await queryRunner.query(`
      ALTER TYPE "esp_type_enum" ADD VALUE IF NOT EXISTS 'ghost';
    `);
    await queryRunner.query(`
      ALTER TYPE "esp_type_enum" ADD VALUE IF NOT EXISTS 'sparkpost';
    `);
    await queryRunner.query(`
      ALTER TYPE "esp_type_enum" ADD VALUE IF NOT EXISTS 'active_campaign';
    `);
    await queryRunner.query(`
      ALTER TYPE "esp_type_enum" ADD VALUE IF NOT EXISTS 'customer_io';
    `);
    await queryRunner.query(`
      ALTER TYPE "esp_type_enum" ADD VALUE IF NOT EXISTS 'sailthru';
    `);
    await queryRunner.query(`
      ALTER TYPE "esp_type_enum" ADD VALUE IF NOT EXISTS 'mailerlite';
    `);
    await queryRunner.query(`
      ALTER TYPE "esp_type_enum" ADD VALUE IF NOT EXISTS 'postup';
    `);
    await queryRunner.query(`
      ALTER TYPE "esp_type_enum" ADD VALUE IF NOT EXISTS 'constant_contact';
    `);
    await queryRunner.query(`
      ALTER TYPE "esp_type_enum" ADD VALUE IF NOT EXISTS 'iterable';
    `);
    await queryRunner.query(`
      ALTER TYPE "esp_type_enum" ADD VALUE IF NOT EXISTS 'sendgrid';
    `);
    await queryRunner.query(`
      ALTER TYPE "esp_type_enum" ADD VALUE IF NOT EXISTS 'brevo';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL does not support removing values from an enum.
    // To remove values, you would need to:
    // 1. Create a new enum type without the values
    // 2. Alter the column to use the new type
    // 3. Drop the old enum type
    // This is complex and risky, so we leave the values in place on rollback.
    // The application will simply not use these values.
    console.log(
      'Note: PostgreSQL does not support removing enum values. The enum values will remain but will not be used by the application.'
    );
  }
}
