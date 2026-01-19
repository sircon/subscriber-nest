import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEspConnectionForOAuth1768744100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create auth_method_enum type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "auth_method_enum" AS ENUM ('api_key', 'oauth');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Check if authMethod column exists before adding
    const table = await queryRunner.getTable('esp_connections');
    const authMethodExists = table?.columns.find(
      (col) => col.name === 'authMethod'
    );

    if (!authMethodExists) {
      // Add authMethod column with default value
      await queryRunner.query(`
        ALTER TABLE "esp_connections" 
        ADD COLUMN IF NOT EXISTS "authMethod" "auth_method_enum" NOT NULL DEFAULT 'api_key'
      `);
    }

    // Make encryptedApiKey nullable
    await queryRunner.query(`
      ALTER TABLE "esp_connections" 
      ALTER COLUMN "encryptedApiKey" DROP NOT NULL
    `);

    // Add encryptedAccessToken column
    await queryRunner.query(`
      ALTER TABLE "esp_connections" 
      ADD COLUMN IF NOT EXISTS "encryptedAccessToken" text
    `);

    // Add encryptedRefreshToken column
    await queryRunner.query(`
      ALTER TABLE "esp_connections" 
      ADD COLUMN IF NOT EXISTS "encryptedRefreshToken" text
    `);

    // Add tokenExpiresAt column
    await queryRunner.query(`
      ALTER TABLE "esp_connections" 
      ADD COLUMN IF NOT EXISTS "tokenExpiresAt" TIMESTAMP
    `);

    // Make publicationId nullable
    await queryRunner.query(`
      ALTER TABLE "esp_connections" 
      ALTER COLUMN "publicationId" DROP NOT NULL
    `);

    // Add publicationIds JSONB column
    await queryRunner.query(`
      ALTER TABLE "esp_connections" 
      ADD COLUMN IF NOT EXISTS "publicationIds" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove new columns
    await queryRunner.query(`
      ALTER TABLE "esp_connections" 
      DROP COLUMN IF EXISTS "publicationIds"
    `);

    await queryRunner.query(`
      ALTER TABLE "esp_connections" 
      ALTER COLUMN "publicationId" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "esp_connections" 
      DROP COLUMN IF EXISTS "tokenExpiresAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "esp_connections" 
      DROP COLUMN IF EXISTS "encryptedRefreshToken"
    `);

    await queryRunner.query(`
      ALTER TABLE "esp_connections" 
      DROP COLUMN IF EXISTS "encryptedAccessToken"
    `);

    await queryRunner.query(`
      ALTER TABLE "esp_connections" 
      ALTER COLUMN "encryptedApiKey" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "esp_connections" 
      DROP COLUMN IF EXISTS "authMethod"
    `);

    // Drop enum type
    await queryRunner.query('DROP TYPE IF EXISTS "auth_method_enum"');
  }
}
