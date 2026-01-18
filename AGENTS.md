# SubscriberNest – Agents

This file describes the main components and responsibilities in the SubscriberNest monorepo for agents and tooling.

## Overview

| App / area | Role |
|------------|------|
| **api** | NestJS HTTP API: connect to ESP(s), sync subscriber data, store in Postgres via TypeORM, expose REST for CRUD and export. Publishes events for worker service. |
| **worker** | NestJS background workers: processes queue jobs (subscriber sync, billing, account deletion) and runs cron jobs (midnight sync, monthly billing, daily account deletion). |
| **frontend** | Next.js app: UI to view subscribers, trigger sync, trigger export, and configure ESP connection. |
| **shared** | Common code shared between API and Worker: entities, DTOs, services, events. |

## Repo layout

- `apps/api` – NestJS HTTP API + TypeORM + PostgreSQL + BullMQ producers  
- `apps/worker` – NestJS background workers + BullMQ processors + cron jobs  
- `apps/frontend` – Next.js + React  
- `packages/shared` – Shared entities, DTOs, services, events  
- `turbo.json` – Turborepo tasks (build, dev, lint, etc.)  
- Root `package.json` – workspaces and Turborepo scripts  

## Shared behavior

- **Build:** `turbo run build`; api/worker → `dist/`, frontend → `.next/`, shared → `dist/`  
- **Dev:** `turbo run dev` runs all services with `cache: false` and `persistent: true`  
- **Lint:** `turbo run lint` (each app defines its own lint)  

## Per‑app agents

- [apps/api/AGENTS.md](./apps/api/AGENTS.md) – API service modules and services  
- [apps/worker/AGENTS.md](./apps/worker/AGENTS.md) – Worker service processors and schedulers  
- [apps/frontend/AGENTS.md](./apps/frontend/AGENTS.md) – Frontend pages and components  

## Conventions

- **API Service:** NestJS modules, TypeORM entities from shared package, migrations in `src/migrations` (compiled to `dist/migrations`). Publishes events via EventEmitter2.  
- **Worker Service:** NestJS modules, BullMQ processors, cron jobs using `@nestjs/schedule`. Listens to events and processes queue jobs.  
- **Shared Package:** Entities, DTOs, services, events. Import using `@subscriber-nest/shared/*` path aliases.  
- **Frontend:** App Router in `src/app`, API calls to API service (e.g. `NEXT_PUBLIC_API_URL`).  
- **Env:** API `.env`, worker `.env`, frontend `.env.local`; do not commit secrets.  
