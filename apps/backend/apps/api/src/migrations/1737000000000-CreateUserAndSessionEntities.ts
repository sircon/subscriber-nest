import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserAndSessionEntities1737000000000 implements MigrationInterface {
  name = 'CreateUserAndSessionEntities1737000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "isOnboarded" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    // Create verification_codes table
    await queryRunner.query(`
      CREATE TABLE "verification_codes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "code" character varying(6) NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "used" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_verification_codes_id" PRIMARY KEY ("id")
      )
    `);

    // Create sessions table
    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "token" character varying NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sessions_token" UNIQUE ("token"),
        CONSTRAINT "FK_sessions_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TABLE "verification_codes"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
