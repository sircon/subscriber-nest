# Frontend agents

Next.js app in `apps/frontend`: UI to manage subscribers, sync, and export.

## Structure

| Area | Responsibility |
|-----|----------------|
| **App Router** | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`. |
| **Subscriber list** (to add) | Page(s) and components to show the subscriber list from the backend. |
| **Sync** (to add) | Trigger sync with ESP and show sync status. |
| **Export** (to add) | Trigger export and handle download (CSV/JSON). |
| **Settings / config** (to add) | ESP connection and app settings. |

## Important paths

- `src/app/layout.tsx` – root layout and metadata.  
- `src/app/page.tsx` – home.  
- `src/app/globals.css` – global styles.  
- `next.config.ts` – Next.js config.  

## Env

- `NEXT_PUBLIC_API_URL` – backend base URL (e.g. `http://localhost:4000`). Use in `apps/frontend/.env.local`.  

## Scripts

- `dev` – `next dev --port 3000`  
- `build` – `next build`  
- `start` – `next start --port 3000`  

## Backend dependency

All subscriber, sync, and export behavior depends on the backend API. Point `NEXT_PUBLIC_API_URL` at the running backend.
