# AudienceSafe

AudienceSafe lets you connect to your Email Service Provider (ESP), keep your subscriber list synced, and export it whenever you need.

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
DATABASE_NAME=audience_safe

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
createdb audience_safe
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

### 7. Docker Compose (Local Development)

Run the entire stack with Docker Compose:

1. **Create `.env` file in root directory:**

```bash
# Copy the example file
cp .env.example .env

# Edit with your values
nano .env
```

**Important:** The `.env` file must be in the **root directory** (same level as `docker-compose.yml`). Docker Compose automatically reads this file and substitutes variables in `${VAR_NAME}` format.

**Required variables for Docker Compose:**
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `STRIPE_METER_ID` - Stripe meter ID
- `STRIPE_PRICE_ID` - Stripe price ID
- `RESEND_API_KEY` - Resend API key
- `ENCRYPTION_KEY` - 64-character hex string (generate with `openssl rand -hex 32`)
- `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` - Database credentials
- `NEXT_PUBLIC_API_URL` - Frontend API URL (e.g., `http://localhost:4000`)

2. **Start all services:**

```bash
docker-compose up -d --build
```

This will start:
- PostgreSQL (port 5434)
- Redis (port 6380)
- API (port 4000)
- Worker (port 4001)
- Frontend (port 3000)

3. **Check service status:**

```bash
docker-compose ps
```

4. **View logs:**

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f worker
docker-compose logs -f frontend
```

5. **Stop services:**

```bash
docker-compose down
```

For more detailed deployment information, see [DEPLOYMENT.md](./DEPLOYMENT.md).

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
