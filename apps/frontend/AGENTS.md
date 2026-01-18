# Frontend agents

Next.js app in `apps/frontend`: UI to manage subscribers, sync, and export.

## Structure

| Area | Responsibility |
|-----|----------------|
| **App Router** | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`. |
| **Dashboard** | Dashboard overview with stats cards and sync history table at `src/app/dashboard/page.tsx`. Layout with sidebar at `src/app/dashboard/layout.tsx`. |
| **ESP Detail** | ESP detail page showing connection info and paginated subscriber list at `src/app/dashboard/esp/[id]/page.tsx`. |
| **Sync** (to add) | Trigger sync with ESP and show sync status. |
| **Export** (to add) | Trigger export and handle download (CSV/JSON). |
| **Settings** (to add) | ESP connection and app settings. |

## Important paths

- `src/app/layout.tsx` – root layout and metadata.  
- `src/app/page.tsx` – home.  
- `src/app/globals.css` – global styles.  
- `src/contexts/AuthContext.tsx` – authentication context provider and useAuth hook.  
- `next.config.ts` – Next.js config.  

## Env

- `NEXT_PUBLIC_API_URL` – backend base URL (e.g. `http://localhost:4000`). Use in `apps/frontend/.env.local`.  

## Scripts

- `dev` – `next dev --port 3000`  
- `build` – `next build`  
- `start` – `next start --port 3000`  

## Backend dependency

All subscriber, sync, and export behavior depends on the backend API. Point `NEXT_PUBLIC_API_URL` at the running backend.

## Authentication

- **AuthContext**: Authentication state is managed via `AuthContext` provider in `src/contexts/AuthContext.tsx`. The provider wraps the app in `src/app/layout.tsx`.
- **useAuth hook**: Use `useAuth()` hook to access authentication state: `{ user, token, loading, isAuthenticated, login, logout, checkAuth }`.
- **Token storage**: Auth tokens are stored in localStorage (keys: `auth_token`, `user`). Can be upgraded to httpOnly cookies later.
- **Session restoration**: On mount, AuthContext loads token from localStorage and calls `GET /auth/me` to verify and restore session.
- **API authentication**: Include token in Authorization header: `Authorization: Bearer ${token}` when making authenticated API calls.

## Next.js App Router patterns

- **Dynamic routes**: Use `[param]` syntax in directory names (e.g., `dashboard/esp/[id]/page.tsx`). Access with `useParams()` hook.
- **useSearchParams() requires Suspense**: When using `useSearchParams()` in a client component, wrap it in a Suspense boundary to avoid build errors. Split the component: create a form component that uses `useSearchParams()`, and a page component that wraps it in `<Suspense>`.
- **Client-side navigation**: Use `useRouter()` from `next/navigation` for client-side navigation in App Router (not `next/router`).
- **Environment variables**: Client components can access `process.env.NEXT_PUBLIC_*` variables directly (replaced at build time).
- **URL pagination**: Use `useSearchParams()` to read pagination params, `useRouter().push()` to update URL. Build query strings with `URLSearchParams` API.

## Dashboard patterns

- **Parallel data fetching**: Use `Promise.all([fetch1(), fetch2()])` to fetch multiple endpoints in parallel for faster page loads.
- **Aggregating data across connections**: When showing data from multiple ESP connections, fetch each connection's data in parallel, then merge and sort the results.
- **Loading states**: Match the skeleton loading state to the final layout structure (e.g., 3 cards + table) for better UX.
- **Relative time formatting**: For "last sync" timestamps, use relative time ("5 mins ago") for recent events and fall back to full date/time for older events.
- **Error handling**: Use silent error handling (return empty array) for individual items in aggregated lists to prevent one failure from breaking the entire dashboard.

## API client patterns

- **API structure**: API client is organized into namespaces (`authApi`, `espConnectionApi`, `dashboardApi`) in `src/lib/api.ts`.
- **Adding new endpoints**: Create interface for response type, then add function to appropriate namespace following existing patterns.
- **Error handling**: All API functions support `onUnauthorized` callback for 401 error handling (typically redirects to login).
- **TypeScript types**: Always define TypeScript interfaces for request/response types at the top of the file.
- **Query parameters**: Use `URLSearchParams` to build query strings. Check if `params.toString()` is empty before adding `?` to URL.
- **Pagination responses**: Backend returns `{ data: T[], total, page, limit, totalPages }`. Define interfaces for both the item type and paginated response type.

## shadcn UI components

- **Adding components**: Use `npx shadcn@latest add <component> --yes` to add components (the `--yes` flag skips prompts).
- **Linting issue**: shadcn CLI generates code with tabs. Always convert tabs to spaces in generated files to avoid linting errors.
- **Available components**: badge, button, card, dropdown-menu, input, separator, sheet, table, tooltip.
