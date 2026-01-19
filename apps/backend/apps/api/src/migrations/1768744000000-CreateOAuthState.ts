import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOAuthState1768744000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create oauth_states table
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "oauth_states" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "espType" "esp_type_enum" NOT NULL,
        "state" character varying(255) NOT NULL,
        "redirectUri" text,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_oauth_states" PRIMARY KEY ("id")
      )`
    );

    // Create foreign key from oauth_states to users
    await queryRunner.query(
      `DO $$ BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'FK_oauth_states_userId'
        ) THEN 
          ALTER TABLE "oauth_states" 
          ADD CONSTRAINT "FK_oauth_states_userId" 
          FOREIGN KEY ("userId") 
          REFERENCES "users"("id") 
          ON DELETE CASCADE; 
        END IF; 
      END $$;`
    );

    // Create unique index on state field
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_oauth_states_state" ON "oauth_states" ("state")`
    );

    // Create index on userId and espType for cleanup queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_oauth_states_userId_espType" ON "oauth_states" ("userId", "espType")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_oauth_states_userId_espType"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_oauth_states_state"`
    );
    await queryRunner.query(
      `ALTER TABLE "oauth_states" DROP CONSTRAINT IF EXISTS "FK_oauth_states_userId"`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "oauth_states"`);
  }
}
