import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountDeletionFields1768737205620 implements MigrationInterface {
  name = 'AddAccountDeletionFields1768737205620';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "deleteRequestedAt" TIMESTAMP`
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "deletedAt" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deletedAt"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "deleteRequestedAt"`
    );
  }
}
