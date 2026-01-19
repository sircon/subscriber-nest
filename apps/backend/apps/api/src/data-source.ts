import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { BillingSubscription } from '../../../libs/database/src/entities/billing-subscription.entity';
import { BillingUsage } from '../../../libs/database/src/entities/billing-usage.entity';
import { EspConnection } from '../../../libs/database/src/entities/esp-connection.entity';
import { OAuthState } from '../../../libs/database/src/entities/oauth-state.entity';
import { Session } from '../../../libs/database/src/entities/session.entity';
import { Subscriber } from '../../../libs/database/src/entities/subscriber.entity';
import { SyncHistory } from '../../../libs/database/src/entities/sync-history.entity';
import { User } from '../../../libs/database/src/entities/user.entity';
import { VerificationCode } from '../../../libs/database/src/entities/verification-code.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'subscriber_nest',
  entities: [
    BillingSubscription,
    BillingUsage,
    EspConnection,
    OAuthState,
    Session,
    Subscriber,
    SyncHistory,
    User,
    VerificationCode,
  ],
  migrations: [join(process.cwd(), 'dist/api/apps/api/src/migrations/*.js')],
  synchronize: false,
});
