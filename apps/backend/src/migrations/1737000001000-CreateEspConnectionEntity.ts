import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEspConnectionEntity1737000001000
  implements MigrationInterface
{
  name = 'CreateEspConnectionEntity1737000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for ESP provider
    await queryRunner.query(`
      CREATE TYPE "esp_provider_enum" AS ENUM ('kit', 'beehiiv', 'mailchimp')
    `);

    // Create esp_connections table
    await queryRunner.query(`
      CREATE TABLE "esp_connections" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "provider" "esp_provider_enum" NOT NULL,
        "apiKey" text NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_esp_connections_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_esp_connections_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "esp_connections"`);
    await queryRunner.query(`DROP TYPE "esp_provider_enum"`);
  }
}
