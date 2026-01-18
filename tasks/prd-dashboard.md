# PRD: User Dashboard

## Introduction

Build a comprehensive dashboard interface for SubscriberNest that provides users with a centralized view of their ESP connections, subscriber data, and sync history. The dashboard will feature a sidebar navigation with ESP list management, a main content area with overview cards and sync history, and detailed ESP views with subscriber tables. The design will be inspired by shadcn's dashboard-01 block pattern, providing a modern and intuitive user experience.

## Goals

- Provide a unified dashboard interface for managing ESP connections and viewing subscriber data
- Display overview metrics (total ESPs, total subscribers, last sync time) in dashboard cards
- Track and display sync history (successful/failed syncs with timestamps)
- Enable users to view detailed subscriber information for each ESP connection
- Support email unmasking on-demand with session-based decryption
- Provide export functionality for subscriber data in multiple formats (CSV, JSON, Excel)
- Create a settings menu structure for future features like billing

## User Stories

### US-001: Create Sync History Entity and Migration
**Description:** As a developer, I need a database table to track sync history so users can see when syncs were performed and whether they succeeded or failed.

**Acceptance Criteria:**
- [ ] Create `SyncHistory` entity with fields: `id` (UUID), `espConnectionId` (FK to EspConnection), `status` (enum: 'success', 'failed'), `startedAt` (timestamp), `completedAt` (timestamp, nullable), `errorMessage` (text, nullable), `createdAt` (timestamp)
- [ ] Add `@ManyToOne` relationship to `EspConnection` entity
- [ ] Generate and run migration successfully
- [ ] Typecheck passes

### US-002: Update Sync Processor to Record Sync History
**Description:** As a developer, I need the sync processor to create sync history records so we can track all sync operations.

**Acceptance Criteria:**
- [ ] Update `SubscriberSyncProcessor` to create a `SyncHistory` record with `status: 'success'` and `startedAt` when sync job starts
- [ ] Update `completedAt` timestamp when sync completes successfully
- [ ] Create `SyncHistory` record with `status: 'failed'` and `errorMessage` when sync fails (after all retries)
- [ ] Store error message from exception in `errorMessage` field
- [ ] Typecheck passes

### US-003: Create Sync History Service
**Description:** As a developer, I need a service to query sync history records so the frontend can display sync history.

**Acceptance Criteria:**
- [ ] Create `SyncHistoryService` with method `findByEspConnection(espConnectionId: string, limit?: number): Promise<SyncHistory[]>`
- [ ] Method returns sync history records ordered by `startedAt` DESC (most recent first)
- [ ] Optional `limit` parameter defaults to 50 if not provided
- [ ] Method includes ESP connection relationship in query
- [ ] Typecheck passes

### US-004: Create Sync History Controller Endpoint
**Description:** As a user, I want to retrieve sync history via API so I can see when syncs occurred and their status.

**Acceptance Criteria:**
- [ ] Add `GET /esp-connections/:id/sync-history` endpoint to `EspConnectionController`
- [ ] Endpoint accepts optional query parameter `limit` (default: 50)
- [ ] Endpoint validates ESP connection exists and belongs to requesting user
- [ ] Returns array of sync history records (without sensitive data)
- [ ] Returns 404 if connection not found, 403 if user doesn't own connection
- [ ] Typecheck passes

### US-005: Create Subscriber List Controller Endpoint
**Description:** As a user, I want to retrieve paginated subscriber data for an ESP connection so I can view my subscribers in the dashboard.

**Acceptance Criteria:**
- [ ] Add `GET /esp-connections/:id/subscribers` endpoint to `EspConnectionController`
- [ ] Endpoint accepts query parameters: `page` (default: 1), `limit` (default: 50), `status` (optional filter by subscriber status)
- [ ] Endpoint validates ESP connection exists and belongs to requesting user
- [ ] Returns paginated response: `{ data: Subscriber[], total: number, page: number, limit: number, totalPages: number }`
- [ ] Subscribers returned with `maskedEmail` (not encrypted email)
- [ ] Returns 404 if connection not found, 403 if user doesn't own connection
- [ ] Typecheck passes

### US-006: Create Unmask Email Endpoint
**Description:** As a user, I want to decrypt a specific subscriber's email address so I can view the full email when needed.

**Acceptance Criteria:**
- [ ] Add `POST /subscribers/:id/unmask` endpoint to a new `SubscriberController`
- [ ] Endpoint validates subscriber exists and belongs to a connection owned by requesting user
- [ ] Endpoint decrypts the subscriber's email using `EncryptionService`
- [ ] Returns `{ email: string }` with decrypted email
- [ ] Returns 404 if subscriber not found, 403 if user doesn't own the connection
- [ ] Typecheck passes

### US-007: Create Export Subscribers Endpoint
**Description:** As a user, I want to export all subscribers for an ESP connection in various formats so I can use the data elsewhere.

**Acceptance Criteria:**
- [ ] Add `GET /esp-connections/:id/subscribers/export` endpoint to `EspConnectionController`
- [ ] Endpoint accepts query parameter `format` (enum: 'csv', 'json', 'xlsx')
- [ ] Endpoint validates ESP connection exists and belongs to requesting user
- [ ] Endpoint fetches all subscribers for the connection (no pagination)
- [ ] Endpoint decrypts all subscriber emails using `EncryptionService`
- [ ] Returns file download with appropriate content-type header
- [ ] CSV format includes: email (decrypted), firstName, lastName, status, subscribedAt, unsubscribedAt, and all metadata fields flattened
- [ ] JSON format includes all subscriber fields with decrypted emails
- [ ] Excel format includes same fields as CSV in spreadsheet format
- [ ] Returns 404 if connection not found, 403 if user doesn't own connection
- [ ] Typecheck passes

### US-008: Create Dashboard Stats Endpoint
**Description:** As a user, I want to retrieve dashboard statistics so I can see overview metrics on the dashboard.

**Acceptance Criteria:**
- [ ] Add `GET /dashboard/stats` endpoint to a new `DashboardController`
- [ ] Endpoint returns: `{ totalEspConnections: number, totalSubscribers: number, lastSyncTime: Date | null }`
- [ ] `totalEspConnections` counts all active ESP connections for the user
- [ ] `totalSubscribers` counts all subscribers across all user's ESP connections
- [ ] `lastSyncTime` is the most recent `completedAt` timestamp from sync history across all connections
- [ ] Returns 401 if not authenticated
- [ ] Typecheck passes

### US-009: Install Required Frontend Dependencies
**Description:** As a developer, I need to install frontend dependencies for data tables, export functionality, and UI components.

**Acceptance Criteria:**
- [ ] Install `@tanstack/react-table` for data table functionality
- [ ] Install `xlsx` or `exceljs` for Excel export generation
- [ ] Install `papaparse` for CSV export generation (or use native implementation)
- [ ] Install shadcn table component: `npx shadcn@latest add table`
- [ ] Install shadcn dropdown-menu component: `npx shadcn@latest add dropdown-menu`
- [ ] Install shadcn sidebar component: `npx shadcn@latest add sidebar` (or similar navigation component)
- [ ] Verify all packages are added to `package.json`
- [ ] Typecheck passes

### US-010: Create Dashboard Layout with Sidebar
**Description:** As a user, I want a dashboard layout with a sidebar navigation so I can easily navigate between ESPs and access settings.

**Acceptance Criteria:**
- [ ] Create new dashboard layout component at `src/app/dashboard/layout.tsx`
- [ ] Layout includes left sidebar (fixed width ~250px) with:
  - List of ESP connections (clickable items showing ESP name/type)
  - "Connect New ESP" button at top of list
  - Settings button at bottom of sidebar
- [ ] Main content area takes remaining width
- [ ] Sidebar is collapsible on mobile (hamburger menu)
- [ ] Active ESP connection is highlighted in sidebar
- [ ] Uses shadcn sidebar or similar navigation component
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-011: Create Dashboard Overview Page
**Description:** As a user, I want to see overview statistics and sync history when I first open the dashboard.

**Acceptance Criteria:**
- [ ] Create dashboard overview at `src/app/dashboard/page.tsx` (or update existing)
- [ ] Page displays three dashboard cards:
  - Card 1: "Total ESPs" with count from stats endpoint
  - Card 2: "Total Subscribers" with count from stats endpoint
  - Card 3: "Last Sync" with formatted timestamp from stats endpoint (or "Never" if null)
- [ ] Below cards, display sync history table with columns: ESP Name, Status, Started At, Completed At, Error (if failed)
- [ ] Sync history table shows most recent 50 syncs across all ESPs
- [ ] Table is sortable by date (default: most recent first)
- [ ] Status column shows badge (green for success, red for failed)
- [ ] Error column only shows when status is 'failed'
- [ ] Page handles loading and error states
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-012: Create ESP Detail Page
**Description:** As a user, I want to see detailed information about a specific ESP connection when I click on it in the sidebar.

**Acceptance Criteria:**
- [ ] Create ESP detail page at `src/app/dashboard/esp/[id]/page.tsx`
- [ ] Page displays ESP connection information cards:
  - Card 1: "List Size" showing total subscriber count for this ESP
  - Card 2: "Last Sync" showing last sync timestamp and status
  - Card 3: "Connection Status" showing ESP connection status
  - Card 4: Additional relevant metrics (e.g., active vs unsubscribed count)
- [ ] Below cards, display paginated subscriber data table
- [ ] Table columns: Email (masked), First Name, Last Name, Status, Subscribed At, Actions
- [ ] Email column shows masked email with small "Unmask" button/icon next to it
- [ ] Pagination controls at bottom: page number, items per page (default: 50), next/previous buttons
- [ ] Page uses URL search params for pagination state (`?page=1&limit=50`)
- [ ] Page handles loading and error states
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-013: Implement Email Unmasking in Subscriber Table
**Description:** As a user, I want to click an unmask button to reveal a subscriber's email address in the table.

**Acceptance Criteria:**
- [ ] Add "Unmask" button/icon next to each masked email in subscriber table
- [ ] Button calls `POST /subscribers/:id/unmask` endpoint when clicked
- [ ] On success, replace masked email with decrypted email in the table row
- [ ] Unmasked email persists in table for the current session (until page refresh)
- [ ] Button changes to "Mask" after unmasking (allows re-masking)
- [ ] Re-masking restores the masked email display
- [ ] Handle loading state while unmasking (disable button, show spinner)
- [ ] Handle error state (show error message, keep masked email)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-014: Implement Export Functionality
**Description:** As a user, I want to export subscriber data in CSV, JSON, or Excel format so I can use it in other tools.

**Acceptance Criteria:**
- [ ] Add "Export" button/dropdown in ESP detail page header
- [ ] Dropdown menu shows options: "Export as CSV", "Export as JSON", "Export as Excel"
- [ ] Clicking an option calls `GET /esp-connections/:id/subscribers/export?format=<format>`
- [ ] On success, triggers browser download with appropriate filename: `subscribers-<esp-name>-<timestamp>.<ext>`
- [ ] CSV file includes all subscriber fields with decrypted emails
- [ ] JSON file includes all subscriber fields with decrypted emails
- [ ] Excel file includes all subscriber fields with decrypted emails in spreadsheet format
- [ ] Handle loading state (disable button, show spinner)
- [ ] Handle error state (show error message to user)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-015: Create Settings Menu Structure
**Description:** As a user, I want a settings menu accessible from the sidebar so I can access future features like billing.

**Acceptance Criteria:**
- [ ] Create settings page at `src/app/dashboard/settings/page.tsx`
- [ ] Page accessible via Settings button in sidebar
- [ ] Page displays settings menu/navigation with sections:
  - "General" (placeholder for future settings)
  - "Billing" (placeholder, shows "Coming soon" message)
  - "Account" (placeholder for future settings)
- [ ] Settings page has basic layout matching dashboard design
- [ ] Menu items are clickable but show placeholder content for now
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-016: Update API Client with New Endpoints
**Description:** As a developer, I need to add API client functions for all new dashboard endpoints so the frontend can call them.

**Acceptance Criteria:**
- [ ] Add `getDashboardStats` function to API client
- [ ] Add `getSyncHistory(espConnectionId: string, limit?: number)` function
- [ ] Add `getSubscribers(espConnectionId: string, page?: number, limit?: number, status?: string)` function
- [ ] Add `unmaskEmail(subscriberId: string)` function
- [ ] Add `exportSubscribers(espConnectionId: string, format: 'csv' | 'json' | 'xlsx')` function
- [ ] All functions include proper TypeScript types
- [ ] All functions handle authentication tokens and 401 errors
- [ ] Export function handles file download response correctly
- [ ] Typecheck passes

### US-017: Add Pagination Component
**Description:** As a developer, I need a reusable pagination component for the subscriber table.

**Acceptance Criteria:**
- [ ] Create pagination component at `src/components/ui/pagination.tsx` (or use shadcn pagination)
- [ ] Component accepts props: `currentPage`, `totalPages`, `onPageChange`, `itemsPerPage`, `totalItems`
- [ ] Component displays: current page info, page number buttons, previous/next buttons
- [ ] Component handles edge cases (first page, last page, single page)
- [ ] Component is accessible (keyboard navigation, ARIA labels)
- [ ] Component matches dashboard design system
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: System must track sync history with status (success/failed) and timestamps for each sync operation
- FR-2: Dashboard must display overview cards showing total ESPs, total subscribers, and last sync time
- FR-3: Dashboard must display sync history table showing recent syncs across all ESP connections
- FR-4: System must provide paginated subscriber list endpoint (default 50 per page)
- FR-5: System must provide email unmasking endpoint that decrypts a single subscriber's email
- FR-6: System must provide export endpoint that decrypts all subscriber emails for export
- FR-7: Export must support CSV, JSON, and Excel formats
- FR-8: Unmasked emails must persist in UI for the current session only (until page refresh)
- FR-9: Dashboard sidebar must list all ESP connections with ability to select one
- FR-10: Dashboard sidebar must include "Connect New ESP" button that navigates to connection flow
- FR-11: Dashboard sidebar must include Settings button that opens settings menu
- FR-12: ESP detail view must show cards with list size, last sync, and connection status
- FR-13: ESP detail view must show paginated subscriber table with unmask functionality
- FR-14: Subscriber table must display masked emails by default with unmask button
- FR-15: Settings page must have menu structure ready for future features (billing, etc.)

## Non-Goals

- No real-time sync status updates (polling or manual refresh required)
- No bulk email unmasking (only individual unmask per subscriber)
- No advanced filtering or search in subscriber table (basic pagination only)
- No subscriber editing or deletion from dashboard
- No sync scheduling or automation (manual sync only)
- No export format customization (fixed field set for all formats)
- No sync history filtering or search (shows all recent syncs)
- No billing functionality implementation (only menu structure)

## Design Considerations

### Layout Structure
- Left sidebar: Fixed width (~250px), contains ESP list, connect button, settings button
- Main content: Flexible width, contains dashboard cards, tables, and detail views
- Responsive: Sidebar collapses to hamburger menu on mobile

### Dashboard Cards
- Use shadcn Card components
- Display metrics with large numbers and descriptive labels
- Use icons to enhance visual hierarchy
- Cards should be clickable if they link to detail views

### Data Tables
- Use shadcn Table component or @tanstack/react-table
- Support sorting and pagination
- Show loading states during data fetch
- Show empty states when no data

### Email Masking/Unmasking
- Masked email format: `m****@example.com` (first character + asterisks)
- Unmask button: Small icon button next to email
- After unmasking: Show full email, button changes to "Mask"
- Visual distinction: Unmasked emails could use different styling

### Export Functionality
- Dropdown menu in ESP detail page header
- Three format options: CSV, JSON, Excel
- Download triggers automatically on selection
- Show loading state during export generation

### Settings Menu
- Simple navigation structure
- Placeholder content for future features
- "Billing" section shows "Coming soon" message

## Technical Considerations

### Backend Dependencies
- No new backend dependencies required (uses existing EncryptionService, TypeORM)
- May need to add file streaming for large exports (consider memory limits)

### Frontend Dependencies
- `@tanstack/react-table` - Data table functionality
- `xlsx` or `exceljs` - Excel file generation (if done client-side, otherwise backend handles)
- `papaparse` - CSV parsing/generation (optional, can use native)
- shadcn components: table, dropdown-menu, sidebar/navigation

### Database Schema
- New `sync_history` table with foreign key to `esp_connections`
- Index on `espConnectionId` and `startedAt` for efficient queries

### API Endpoints
- `GET /dashboard/stats` - Dashboard overview statistics
- `GET /esp-connections/:id/sync-history` - Sync history for ESP
- `GET /esp-connections/:id/subscribers` - Paginated subscriber list
- `POST /subscribers/:id/unmask` - Decrypt single email
- `GET /esp-connections/:id/subscribers/export` - Export subscribers

### Performance Considerations
- Pagination limits large subscriber lists (50 per page default)
- Export may be slow for large lists - consider async job queue for very large exports
- Sync history limited to 50 most recent by default
- Index database tables for efficient queries

### Security Considerations
- Email unmasking requires user to own the ESP connection
- Export decrypts all emails - ensure proper authorization
- All endpoints require authentication
- Export files should be generated server-side to avoid exposing encryption keys

## Success Metrics

- Users can view dashboard overview with accurate statistics
- Users can see sync history for all their ESP connections
- Users can navigate to ESP detail view and see subscriber list
- Users can unmask individual emails successfully
- Users can export subscriber data in all three formats (CSV, JSON, Excel)
- Export files contain decrypted emails for all subscribers
- Dashboard loads in under 2 seconds
- Subscriber table pagination works smoothly for lists with 1000+ subscribers
- Settings menu structure is ready for future billing integration

## Open Questions

- Should sync history be limited per ESP or show all syncs across all ESPs? (Assumption: all syncs)
- Should export be synchronous or async for very large lists? (Assumption: synchronous for now, can optimize later)
- Should unmasked emails be cached in frontend state or re-fetched on each unmask? (Assumption: cached in session)
- Should we add filtering by subscriber status in the table? (Out of scope for now)
- Should we add search functionality in subscriber table? (Out of scope for now)
- Should settings page be a modal/drawer or full page? (Assumption: full page for now)
