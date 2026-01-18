import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateSyncHistory1737220000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create sync_history_status_enum type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "sync_history_status_enum" AS ENUM ('success', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create sync_history table
    await queryRunner.createTable(
      new Table({
        name: 'sync_history',
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
            isNullable: false,
          },
          {
            name: 'status',
            type: 'sync_history_status_enum',
            isNullable: false,
          },
          {
            name: 'startedAt',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'sync_history',
      new TableForeignKey({
        columnNames: ['espConnectionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'esp_connections',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop sync_history table (foreign key will be dropped automatically)
    await queryRunner.dropTable('sync_history');

    // Drop sync_history_status_enum type
    await queryRunner.query('DROP TYPE IF EXISTS "sync_history_status_enum"');
  }
}
