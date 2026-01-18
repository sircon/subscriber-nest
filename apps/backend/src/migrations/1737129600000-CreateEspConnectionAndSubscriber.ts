import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateEspConnectionAndSubscriber1737129600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "esp_type_enum" AS ENUM ('beehiiv', 'kit', 'mailchimp');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "esp_connection_status_enum" AS ENUM ('active', 'invalid', 'error');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "subscriber_status_enum" AS ENUM ('active', 'unsubscribed', 'bounced');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create esp_connections table
    await queryRunner.createTable(
      new Table({
        name: 'esp_connections',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'espType',
            type: 'esp_type_enum',
          },
          {
            name: 'encryptedApiKey',
            type: 'text',
          },
          {
            name: 'publicationId',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'status',
            type: 'esp_connection_status_enum',
            default: "'active'",
          },
          {
            name: 'lastValidatedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastSyncedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create subscribers table
    await queryRunner.createTable(
      new Table({
        name: 'subscribers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'espConnectionId',
            type: 'uuid',
          },
          {
            name: 'externalId',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'encryptedEmail',
            type: 'text',
          },
          {
            name: 'maskedEmail',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'status',
            type: 'subscriber_status_enum',
            default: "'active'",
          },
          {
            name: 'firstName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'lastName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'subscribedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'unsubscribedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign key from subscribers to esp_connections
    await queryRunner.createForeignKey(
      'subscribers',
      new TableForeignKey({
        columnNames: ['espConnectionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'esp_connections',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign key from esp_connections to users
    await queryRunner.createForeignKey(
      'esp_connections',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create unique index on espConnectionId + externalId
    await queryRunner.createIndex(
      'subscribers',
      new TableIndex({
        columnNames: ['espConnectionId', 'externalId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('subscribers', true);
    await queryRunner.dropTable('esp_connections', true);
    
    // Drop enum types
    await queryRunner.query('DROP TYPE IF EXISTS "subscriber_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "esp_connection_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "esp_type_enum"');
  }
}
