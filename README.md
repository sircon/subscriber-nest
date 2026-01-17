# SubscriberNest

SubscriberNest lets you connect to your Email Service Provider (ESP), keep your subscriber list synced, and export it whenever you need.

## Tech Stack

- **Backend:** NestJS + PostgreSQL (TypeORM)
- **Frontend:** Next.js + React
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

**Backend** (`apps/backend`)

Copy `apps/backend/.env.example` to `apps/backend/.env`, or create `.env` with:

```env
PORT=4000

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=subscriber_nest

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

Run both apps in dev mode:

```bash
npm run dev
```

- **Backend:** http://localhost:4000  
- **Frontend:** http://localhost:3000  

Run a single app:

```bash
npm run dev --filter=backend
npm run dev --filter=frontend
```

### 5. Build

```bash
npm run build
```

### 6. Production

**Backend:**

```bash
cd apps/backend && npm run start
```

**Frontend:**

```bash
cd apps/frontend && npm run start
```

## Project structure

```
├── apps/
│   ├── backend/     # NestJS API (TypeORM, Postgres)
│   └── frontend/    # Next.js app
├── turbo.json       # Turborepo config
├── package.json
├── README.md
└── AGENTS.md
```

## Backend scripts

From `apps/backend`:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with watch mode |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run migration:generate -- src/migrations/MigrationName` | Generate migration |
| `npm run migration:run` | Run pending migrations |
| `npm run migration:revert` | Revert last migration |

Run `nest build` before `migration:run` so `dist/migrations` exists.

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

See [AGENTS.md](./AGENTS.md) for an overview. Each app has its own `AGENTS.md` in `apps/backend` and `apps/frontend`.
