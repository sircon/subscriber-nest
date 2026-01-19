import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'subscriber_nest',
  entities: [join(process.cwd(), 'libs/database/src/**/*.entity.ts')],
  migrations: [join(process.cwd(), 'dist/api/apps/api/src/migrations/*.js')],
  synchronize: false,
});
