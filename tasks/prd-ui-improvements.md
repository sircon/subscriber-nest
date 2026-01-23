# PRD: Frontend UI Improvements

## Introduction

This PRD addresses multiple UI/UX issues and improvements identified in the frontend application. These improvements focus on visual consistency, user experience, functionality fixes, and better integration with the dark theme. The changes span across the onboarding flow, dashboard, connection pages, and list management components.

## Goals

- Fix visual inconsistencies with checkboxes and dark theme
- Improve onboarding flow with skip option
- Fix Stripe redirect URLs to use proper environment configuration
- Replace sync history table with comprehensive subscriber list in dashboard
- Fix subscriber breakdown to show connection-wide statistics
- Improve list management UX with better modal behavior and sidebar integration
- Ensure sync only processes selected lists

## User Stories

### US-001: Fix List Selector Checkbox Styling
**Description:** As a user, I want checkboxes in the list selector to look like checkboxes when selected, not like buttons, so the UI is more intuitive.

**Acceptance Criteria:**
- [ ] Selected checkboxes in ListSelector component maintain checkbox appearance (not button-like)
- [ ] Checkbox styling is consistent with unselected state but clearly indicates selection
- [ ] Visual feedback is clear and follows design system patterns
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-002: Add Skip Button to Onboarding Final Step
**Description:** As a user, I want to skip the final onboarding step (Stripe payment) so I can finish onboarding without syncing lists immediately.

**Acceptance Criteria:**
- [ ] Add secondary "Skip" button to `/onboarding/stripe` page
- [ ] Skip button is visually distinct from primary "Connect Stripe" button
- [ ] Clicking Skip completes onboarding without triggering sync
- [ ] User is redirected to dashboard after skipping
- [ ] Onboarding completion status is properly set
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-003: Fix Stripe Success/Cancel URLs
**Description:** As a developer, I want Stripe checkout success and cancel URLs to use the configured frontend URL instead of hardcoded localhost, so redirects work correctly in all environments.

**Acceptance Criteria:**
- [ ] Backend uses `NEXT_PUBLIC_URL` or `FRONTEND_URL` environment variable for success URL
- [ ] Backend uses `NEXT_PUBLIC_URL` or `FRONTEND_URL` environment variable for cancel URL
- [ ] Fallback to current URL origin if environment variable not set
- [ ] Success URL: `{FRONTEND_URL}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`
- [ ] Cancel URL: `{FRONTEND_URL}/onboarding/stripe?canceled=true`
- [ ] Works correctly in development, staging, and production
- [ ] Typecheck passes

### US-004: Replace Dashboard Sync History with All Subscribers Table
**Description:** As a user, I want to see all subscribers from all connections in the dashboard instead of sync history, so I have a unified view of my subscriber data.

**Acceptance Criteria:**
- [ ] Remove sync history table from dashboard (`/dashboard`)
- [ ] Add "All Subscribers" table showing subscribers from all connections
- [ ] Table includes columns: Email, First Name, Last Name, Status, Subscribed At, Connection (ESP name)
- [ ] Table supports pagination (50 items per page by default)
- [ ] Table shows empty state when no subscribers exist
- [ ] Connection column displays ESP name (e.g., "Mailchimp", "Kit")
- [ ] Table styling matches existing subscriber table in connection detail page
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Fix Loading Skeletons for Dark Theme
**Description:** As a user, I want loading skeletons to look good in dark theme, so the UI is visually consistent.

**Acceptance Criteria:**
- [ ] Loading skeletons in connection page use dark theme-appropriate colors
- [ ] Skeleton colors are visible but not too bright in dark mode
- [ ] Skeleton styling adapts to theme (light/dark)
- [ ] All skeleton states in connection detail page are updated
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: Fix Subscriber Breakdown to Show Connection-Wide Stats
**Description:** As a user, I want the subscriber breakdown card to show statistics for the entire connection, not just the current page, so I get accurate overview information.

**Acceptance Criteria:**
- [ ] Subscriber breakdown card calculates active/unsubscribed counts from all subscribers in connection
- [ ] Breakdown uses total connection subscriber count, not paginated data
- [ ] Backend API endpoint provides connection-wide subscriber statistics
- [ ] Frontend fetches and displays connection-wide breakdown
- [ ] Breakdown updates when sync completes
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: Fix Select Lists Modal Dark Theme
**Description:** As a user, I want the Select Lists modal to match the dark theme, so the UI is visually consistent.

**Acceptance Criteria:**
- [ ] Manage Lists dialog uses dark theme styling
- [ ] Dialog background, text, and borders are dark theme-appropriate
- [ ] ListSelector component within dialog respects dark theme
- [ ] All interactive elements are visible and accessible in dark mode
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Move Selected Lists to Sidebar Submenu
**Description:** As a user, I want to access Selected Lists management and connection actions from a sidebar submenu, so the connection page is less cluttered.

**Acceptance Criteria:**
- [ ] Remove "Selected Lists" card from connection detail page
- [ ] Add three-dot menu icon to connection item in sidebar
- [ ] Submenu appears on hover/click of three-dot icon
- [ ] Submenu contains: "Manage Lists" and "Delete Connection" options
- [ ] "Manage Lists" opens the existing Manage Lists dialog
- [ ] "Delete Connection" opens delete confirmation dialog
- [ ] Submenu works in both desktop and mobile sidebar
- [ ] Selected lists count is still visible in sidebar connection item
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-009: Change List Selection to Save on Modal Action Only
**Description:** As a user, I want list selection changes to only save when I click the primary action button, so I have control over when changes are applied.

**Acceptance Criteria:**
- [ ] Remove auto-save behavior from ListSelector when used in Manage Lists dialog
- [ ] Remove success alert that appears when selecting/deselecting items
- [ ] Add "Save" button as primary action in Manage Lists dialog footer
- [ ] Add "Cancel" button as secondary action in Manage Lists dialog footer
- [ ] Changes are only saved when "Save" button is clicked
- [ ] Success toast notification appears after successful save
- [ ] Dialog closes after successful save
- [ ] Cancel button discards changes and closes dialog
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-010: Fix Sync to Only Process Selected Lists
**Description:** As a user, I want sync operations to only process selected lists, not all available lists, so I have control over what data is synced.

**Acceptance Criteria:**
- [ ] Backend sync service only syncs lists in `publicationIds` array
- [ ] If no lists are selected (`publicationIds` is empty/null), sync shows "No lists selected" message
- [ ] Sync operation validates that selected lists exist before processing
- [ ] Frontend displays appropriate message when triggering sync with no selected lists
- [ ] Sync history reflects which lists were synced
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: ListSelector checkboxes must maintain checkbox appearance when selected
- FR-2: Onboarding Stripe page must include a "Skip" secondary button that completes onboarding without sync
- FR-3: Stripe checkout session creation must use `FRONTEND_URL` or `NEXT_PUBLIC_URL` environment variable for success/cancel URLs
- FR-4: Dashboard must display all subscribers table instead of sync history table
- FR-5: All subscribers table must include Connection column showing ESP name
- FR-6: Loading skeletons must use dark theme-appropriate colors
- FR-7: Subscriber breakdown must calculate from connection-wide data, not paginated subset
- FR-8: Manage Lists dialog must use dark theme styling
- FR-9: Selected Lists card must be removed from connection detail page
- FR-10: Sidebar connection items must have three-dot menu with "Manage Lists" and "Delete Connection" options
- FR-11: List selection changes must only save when "Save" button is clicked in modal
- FR-12: Success toast must appear after saving list selection changes
- FR-13: Sync operation must only process lists in `publicationIds` array
- FR-14: Sync must show appropriate message when no lists are selected

## Non-Goals

- No changes to backend sync job processing logic beyond selected lists filtering
- No changes to subscriber data model or database schema
- No changes to authentication or authorization logic
- No changes to billing/subscription logic beyond URL fixes
- No new ESP connector implementations
- No changes to export functionality

## Design Considerations

- **Dark Theme:** All components must respect dark theme settings and use appropriate color schemes
- **Consistency:** UI changes should maintain consistency with existing design system
- **Accessibility:** All interactive elements must remain keyboard accessible and screen reader friendly
- **Responsive:** Sidebar submenu must work on both desktop and mobile layouts
- **Loading States:** Loading skeletons should use theme-aware colors that work in both light and dark modes

## Technical Considerations

- **Environment Variables:** Backend needs access to `FRONTEND_URL` or `NEXT_PUBLIC_URL` for Stripe redirects
- **API Changes:** May need new endpoint for connection-wide subscriber statistics
- **State Management:** List selection state must be managed locally until save is clicked
- **Sidebar Component:** Dashboard layout sidebar needs to support submenu functionality
- **Sync Service:** Backend sync service must filter by `publicationIds` when processing
- **Toast Notifications:** Need to use existing toast/notification system for save success messages

## Success Metrics

- All UI components properly support dark theme
- Stripe redirects work correctly in all environments
- Users can skip onboarding without syncing
- Dashboard provides unified view of all subscribers
- Sync operations respect selected lists configuration
- List management workflow is more intuitive

## Open Questions

- Should the "Skip" button in onboarding be available on all attempts or only the first?
- Should the all subscribers table in dashboard support filtering by connection?
- Should the sidebar submenu be accessible via keyboard navigation?
- Should we add a confirmation step before deleting connection from sidebar menu?
- Should sync show a warning if no lists are selected, or just prevent the action?
