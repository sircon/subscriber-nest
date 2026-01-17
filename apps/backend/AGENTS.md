# Backend agents

NestJS app in `apps/backend`: ESP integration, subscriber sync, storage, and export.

## Modules / areas

| Area | Responsibility |
|-----|----------------|
| **AppModule** | Root module: `ConfigModule`, `TypeOrmModule` (Postgres), `AppController` / `AppService`. |
| **TypeORM / DB** | Postgres via TypeORM. `src/data-source.ts` is used by the TypeORM CLI for migrations. |
| **ESP connector** (to add) | Connect to ESP APIs, auth, fetch subscriber lists. |
| **Sync** (to add) | Compare ESP vs local DB, apply creates/updates/deletes, handle conflicts. |
| **Subscribers** (to add) | CRUD for subscriber entities and list/export endpoints. |
| **Export** (to add) | Export subscriber list (e.g. CSV/JSON), optionally streamed or async. |

## Important paths

- `src/main.ts` – bootstrap, CORS, port from `PORT` or 4000.  
- `src/app.module.ts` – TypeORM and env-based DB config.  
- `src/data-source.ts` – DataSource for `migration:generate`, `migration:run`, `migration:revert`.  
- `src/migrations/` – migration files (built to `dist/migrations/` for `migration:run`).  

## Env (see `.env.example` or root README)

- `DATABASE_*` – Postgres connection.  
- `PORT` – HTTP port (default 4000).  
- `NODE_ENV` – e.g. `development` / `production`; `synchronize` is off in production.  

## Scripts

- `dev` – `nest start --watch`  
- `build` – `nest build`  
- `start` – `node dist/main.js`  
- `migration:generate`, `migration:run`, `migration:revert` – TypeORM CLI via `data-source.ts`. Run `nest build` before `migration:run`.  
