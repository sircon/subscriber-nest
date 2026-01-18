# SubscriberNest

SubscriberNest lets you connect to your Email Service Provider (ESP), keep your subscriber list synced, and export it whenever you need.

## Tech Stack

- **API Service:** NestJS HTTP API (TypeORM, PostgreSQL)
- **Worker Service:** NestJS background workers (BullMQ, cron jobs)
- **Frontend:** Next.js + React
- **Shared Package:** Common entities, DTOs, and services
- **Monorepo:** [Turborepo](https://turborepo.dev/)

## Versions

| Package | Version |
|---------|---------|
| NestJS | ^11.1.12 |
| Next.js | ^16.1.3 |
| React | ^19.2.3 |
| TypeORM | ^0.3.28 |

## Prerequisites

- **Node.js** >= 20
- **PostgreSQL** (local or remote)
- **npm** (or pnpm / yarn)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

**API Service** (`apps/api`)

Copy `apps/api/.env.example` to `apps/api/.env`, or create `.env` with:

```env
PORT=4000

# Database (shared with worker)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=subscriber_nest

# Redis (shared with worker)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Encryption (shared with worker)
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Stripe (API-specific)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_METER_ID=mtr_...

# Email (API-specific)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@example.com

NODE_ENV=development
```

**Worker Service** (`apps/worker`)

Copy `apps/worker/.env.example` to `apps/worker/.env`, or create `.env` with:

```env
# Database (shared with API)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=subscriber_nest

# Redis (shared with API)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Encryption (shared with API)
ENCRYPTION_KEY=your-32-character-encryption-key-here

NODE_ENV=development
```

**Frontend** (`apps/frontend`)

Create `apps/frontend/.env.local` if you need to override the API URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Database

Ensure PostgreSQL is running and the database exists:

```bash
createdb subscriber_nest
```

Or create it via your PostgreSQL client.

### 4. Development

Run all services in dev mode:

```bash
npm run dev
```

This starts:
- **API Service:** http://localhost:4000  
- **Worker Service:** (runs in background, processes jobs)
- **Frontend:** http://localhost:3000  

Run services independently:

```bash
# Run only API service
npm run dev --filter=api

# Run only worker service
npm run dev --filter=worker

# Run only frontend
npm run dev --filter=frontend

# Run API and worker together
npm run dev --filter=api --filter=worker
```

### 5. Build

```bash
npm run build
```

### 6. Production

**API Service:**

```bash
cd apps/api && npm run start
```

**Worker Service:**

```bash
cd apps/worker && npm run start
```

**Frontend:**

```bash
cd apps/frontend && npm run start
```

## Project structure

```
├── apps/
│   ├── api/         # NestJS HTTP API (TypeORM, Postgres, BullMQ producers)
│   ├── worker/      # NestJS background workers (BullMQ processors, cron jobs)
│   └── frontend/    # Next.js app
├── packages/
│   └── shared/      # Shared entities, DTOs, services, events
├── turbo.json       # Turborepo config
├── package.json
├── README.md
└── AGENTS.md
```

## Shared Package

The `packages/shared` package contains code shared between API and Worker services:

- **Entities:** TypeORM entities (Subscriber, EspConnection, User, etc.)
- **DTOs:** Data transfer objects (CreateSubscriberDto, CreateEspConnectionDto)
- **Services:** Common services (EncryptionService)
- **Events:** Event classes for inter-service communication (SyncRequestedEvent)

Import from shared package using TypeScript path aliases:

```typescript
import { Subscriber } from '@subscriber-nest/shared/entities';
import { CreateSubscriberDto } from '@subscriber-nest/shared/dto';
import { EncryptionService } from '@subscriber-nest/shared/services';
```

## API Service scripts

From `apps/api`:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with watch mode |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run migration:generate -- src/migrations/MigrationName` | Generate migration |
| `npm run migration:run` | Run pending migrations |
| `npm run migration:revert` | Revert last migration |

Run `nest build` before `migration:run` so `dist/migrations` exists.

## Worker Service scripts

From `apps/worker`:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with watch mode (processes jobs and runs cron jobs) |
| `npm run build` | Build for production |
| `npm run start` | Run production build |

## Frontend scripts

From `apps/frontend`:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |

## Turborepo commands (from root)

| Command | Description |
|---------|-------------|
| `npm run build` | Build all apps |
| `npm run dev` | Run all apps in dev mode |
| `npm run lint` | Lint all apps |
| `npm run clean` | Remove build outputs |

## Agents

See [AGENTS.md](./AGENTS.md) for an overview. Each app has its own `AGENTS.md`:
- `apps/api/AGENTS.md` - API service modules and services
- `apps/worker/AGENTS.md` - Worker service processors and schedulers
- `apps/frontend/AGENTS.md` - Frontend pages and components
