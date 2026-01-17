# Backend agents

NestJS app in `apps/backend`: ESP integration, subscriber sync, storage, and export.

## Modules / areas

| Area | Responsibility |
|-----|----------------|
| **AppModule** | Root module: `ConfigModule`, `TypeOrmModule` (Postgres), `AppController` / `AppService`. |
| **TypeORM / DB** | Postgres via TypeORM. `src/data-source.ts` is used by the TypeORM CLI for migrations. |
| **ESP connector** (to add) | Connect to ESP APIs, auth, fetch subscriber lists. |
| **Sync** (to add) | Compare ESP vs local DB, apply creates/updates/deletes, handle conflicts. |
| **Subscribers** | CRUD for subscriber entities via `SubscriberService`. Services use `@InjectRepository()` to inject TypeORM repositories. |
| **Export** (to add) | Export subscriber list (e.g. CSV/JSON), optionally streamed or async. |

## Important paths

- `src/main.ts` – bootstrap, CORS, port from `PORT` or 4000.  
- `src/app.module.ts` – TypeORM and env-based DB config.  
- `src/data-source.ts` – DataSource for `migration:generate`, `migration:run`, `migration:revert`.  
- `src/migrations/` – migration files (built to `dist/migrations/` for `migration:run`).  
- `src/services/` – Injectable services (e.g., `SubscriberService`, `EncryptionService`).  
- `src/dto/` – Data Transfer Objects for API requests/responses (e.g., `CreateSubscriberDto`).  
- `src/entities/` – TypeORM entities (e.g., `Subscriber`, `EspConnection`).  

## Env (see `.env.example` or root README)

- `DATABASE_*` – Postgres connection.  
- `PORT` – HTTP port (default 4000).  
- `NODE_ENV` – e.g. `development` / `production`; `synchronize` is off in production.  

## Scripts

- `dev` – `nest start --watch`  
- `build` – `nest build`  
- `start` – `node dist/main.js`  
- `migration:generate`, `migration:run`, `migration:revert` – TypeORM CLI via `data-source.ts`. Run `nest build` before `migration:run`.

## Patterns

- **Services with TypeORM**: Use `@InjectRepository(Entity)` to inject repositories. Register entities with `TypeOrmModule.forFeature([Entity])` in the module.
- **Upsert pattern**: Use `findOne()` to check existence, then `save()` to create or update. The unique constraint on `externalId + espConnectionId` ensures data integrity.
- **BullMQ queues**: Configure queues using `BullModule.registerQueue()` with `defaultJobOptions` for retry policies. Use `attempts: 3` and `backoff: { type: 'exponential', delay: 2000 }` for automatic retries with exponential backoff (2s, 4s, 8s delays).  
