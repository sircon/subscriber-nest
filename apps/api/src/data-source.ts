import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Import all entities from shared package
import {
    Subscriber,
    EspConnection,
    VerificationCode,
    User,
    Session,
    SyncHistory,
    BillingSubscription,
    BillingUsage,
} from "@subscriber-nest/shared/entities";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DATABASE_HOST ?? "localhost",
    port: parseInt(process.env.DATABASE_PORT ?? "5432", 10),
    username: process.env.DATABASE_USER ?? "postgres",
    password: process.env.DATABASE_PASSWORD ?? "postgres",
    database: process.env.DATABASE_NAME ?? "subscriber_nest",
    entities: [
        Subscriber,
        EspConnection,
        VerificationCode,
        User,
        Session,
        SyncHistory,
        BillingSubscription,
        BillingUsage,
    ],
    migrations: [
        // Migrations are in src/migrations/ and compiled to dist/migrations/
        // When running with ts-node (generation): __dirname = src, so path = migrations/*.ts
        // When running compiled (execution): __dirname = dist, so path = migrations/*.js
        path.join(__dirname, "../migrations/*.ts"),
    ],
    synchronize: false, // Always use migrations in production
    logging: process.env.NODE_ENV === "development",
});
