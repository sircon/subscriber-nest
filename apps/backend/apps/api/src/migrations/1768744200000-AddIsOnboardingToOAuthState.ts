import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsOnboardingToOAuthState1768744200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add isOnboarding column to oauth_states table
    await queryRunner.query(
      `ALTER TABLE "oauth_states" ADD COLUMN IF NOT EXISTS "isOnboarding" boolean NOT NULL DEFAULT false`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "oauth_states" DROP COLUMN IF EXISTS "isOnboarding"`
    );
  }
}
