import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSyncStatusToEspConnection1737200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create esp_sync_status_enum type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "esp_sync_status_enum" AS ENUM ('idle', 'syncing', 'synced', 'error');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Check if column exists before adding
    const table = await queryRunner.getTable('esp_connections');
    const columnExists = table?.columns.find((col) => col.name === 'syncStatus');

    if (!columnExists) {
      // Add syncStatus column to esp_connections table
      await queryRunner.addColumn(
        'esp_connections',
        new TableColumn({
          name: 'syncStatus',
          type: 'esp_sync_status_enum',
          default: "'idle'",
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove syncStatus column from esp_connections table
    await queryRunner.dropColumn('esp_connections', 'syncStatus');

    // Drop esp_sync_status_enum type
    await queryRunner.query('DROP TYPE IF EXISTS "esp_sync_status_enum"');
  }
}
