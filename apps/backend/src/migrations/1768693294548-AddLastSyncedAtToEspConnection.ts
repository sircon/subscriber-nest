import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLastSyncedAtToEspConnection1768693294548
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'esp_connections',
      new TableColumn({
        name: 'lastSyncedAt',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('esp_connections', 'lastSyncedAt');
  }
}
