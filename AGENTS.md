# AudienceSafe – Agents

This file describes the main components and responsibilities in the AudienceSafe monorepo for agents and tooling.

## Overview

| App / area | Role |
|------------|------|
| **backend** | NestJS API: connect to ESP(s), sync subscriber data, store in Postgres via TypeORM, expose REST for CRUD and export. |
| **frontend** | Next.js app: UI to view subscribers, trigger sync, trigger export, and configure ESP connection. |

## Repo layout

- `apps/backend` – NestJS + TypeORM + PostgreSQL  
- `apps/frontend` – Next.js + React  
- `turbo.json` – Turborepo tasks (build, dev, lint, etc.)  
- Root `package.json` – workspaces and Turborepo scripts  

## Shared behavior

- **Build:** `turbo run build`; backend → `dist/`, frontend → `.next/`  
- **Dev:** `turbo run dev` runs both with `cache: false` and `persistent: true`  
- **Lint:** `turbo run lint` (each app defines its own lint)  

## Per‑app agents

- [apps/backend/AGENTS.md](./apps/backend/AGENTS.md) – backend modules and services  
- [apps/frontend/AGENTS.md](./apps/frontend/AGENTS.md) – frontend pages and components  

## Conventions

- Backend: NestJS modules, TypeORM entities in `src`, migrations in `src/migrations` (compiled to `dist/migrations`).  
- Frontend: App Router in `src/app`, API calls to backend (e.g. `NEXT_PUBLIC_API_URL`).  
- Env: backend `.env`, frontend `.env.local`; do not commit secrets.  
