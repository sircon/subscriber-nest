#!/usr/bin/env node
/**
 * Migration runner for production
 * This script runs TypeORM migrations using the compiled migration files
 */
const { DataSource } = require('typeorm');
const { join } = require('path');

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'subscriber_nest',
  migrations: [join(process.cwd(), 'dist/apps/api/src/migrations/*.js')],
  synchronize: false,
});

async function runMigrations() {
  try {
    console.log('Initializing database connection...');
    await dataSource.initialize();
    console.log('Running migrations...');
    const migrations = await dataSource.runMigrations();
    if (migrations.length === 0) {
      console.log('No pending migrations found.');
    } else {
      console.log(`Successfully ran ${migrations.length} migration(s):`);
      migrations.forEach((migration) => {
        console.log(`  - ${migration.name}`);
      });
    }
    await dataSource.destroy();
    console.log('Migrations completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await dataSource.destroy().catch(() => {});
    process.exit(1);
  }
}

runMigrations();
