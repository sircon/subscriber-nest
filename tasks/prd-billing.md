# PRD: Billing Module with Stripe Integration

## Introduction

Implement a comprehensive billing system for AudienceSafe that integrates with Stripe to manage subscriptions based on subscriber count. The billing is usage-based, calculated monthly from the maximum number of subscribers (sum across all publications) during each billing period. Users must have an active Stripe subscription to sync subscribers or export data. The system includes a settings page for viewing usage, managing subscriptions, and account deletion with a 30-day grace period for data export.

## Goals

- Integrate Stripe for subscription management and billing
- Calculate monthly charges based on subscriber count (sum across all publications)
- Implement pricing tiers: $5 for first 10k subscribers, then $1 per 10k subscribers
- Require Stripe connection during onboarding before users can access the platform
- Block sync and export functionality when subscription is inactive
- Provide settings page for viewing usage, invoices, and subscription management
- Support account deletion with 30-day soft delete period allowing data export
- Allow access until end of billing period after subscription cancellation

## User Stories

### US-001: Create Billing Subscription Entity
**Description:** As a developer, I need a database entity to store Stripe subscription information linked to users so we can track subscription status and billing details.

**Acceptance Criteria:**
- [ ] Create `BillingSubscription` entity with fields: `id` (UUID), `userId` (FK to User, unique), `stripeCustomerId` (string, unique), `stripeSubscriptionId` (string, unique, nullable), `stripePriceId` (string, nullable), `status` (enum: 'active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired'), `currentPeriodStart` (timestamp, nullable), `currentPeriodEnd` (timestamp, nullable), `cancelAtPeriodEnd` (boolean, default false), `canceledAt` (timestamp, nullable), `createdAt` (timestamp), `updatedAt` (timestamp)
- [ ] Add `@OneToOne` relationship to `User` entity
- [ ] Generate and run migration successfully
- [ ] Typecheck passes

### US-002: Create Billing Usage Entity
**Description:** As a developer, I need a database entity to track monthly subscriber counts for billing calculation so we can charge users correctly at the end of each period.

**Acceptance Criteria:**
- [ ] Create `BillingUsage` entity with fields: `id` (UUID), `userId` (FK to User), `billingPeriodStart` (timestamp), `billingPeriodEnd` (timestamp), `maxSubscriberCount` (integer), `calculatedAmount` (decimal, precision 10, scale 2), `stripeInvoiceId` (string, nullable), `status` (enum: 'pending', 'invoiced', 'paid', 'failed'), `createdAt` (timestamp), `updatedAt` (timestamp)
- [ ] Add `@ManyToOne` relationship to `User` entity
- [ ] Add unique index on `userId` + `billingPeriodStart` to prevent duplicates
- [ ] Generate and run migration successfully
- [ ] Typecheck passes

### US-003: Add Stripe Configuration to Backend
**Description:** As a developer, I need Stripe SDK configured in the backend so we can interact with Stripe APIs for subscription management.

**Acceptance Criteria:**
- [ ] Install `stripe` npm package in backend
- [ ] Add Stripe secret key to environment variables (`STRIPE_SECRET_KEY`)
- [ ] Add Stripe webhook secret to environment variables (`STRIPE_WEBHOOK_SECRET`)
- [ ] Create `StripeService` with methods to initialize Stripe client
- [ ] Service validates Stripe keys are configured on initialization
- [ ] Typecheck passes

### US-004: Create Stripe Service for Customer Management
**Description:** As a developer, I need a service to create and manage Stripe customers so users can be linked to Stripe billing accounts.

**Acceptance Criteria:**
- [ ] Add method `createCustomer(email: string, userId: string): Promise<Stripe.Customer>` to `StripeService`
- [ ] Method creates Stripe customer with email and metadata containing userId
- [ ] Method returns Stripe customer object
- [ ] Handle Stripe API errors appropriately
- [ ] Typecheck passes

### US-005: Create Stripe Service for Subscription Management
**Description:** As a developer, I need a service to create and manage Stripe subscriptions so users can be billed monthly.

**Acceptance Criteria:**
- [ ] Add method `createSubscription(customerId: string): Promise<Stripe.Subscription>` to `StripeService`
- [ ] Method creates Stripe subscription with monthly billing cycle
- [ ] Subscription uses metered billing (usage-based pricing)
- [ ] Method returns Stripe subscription object
- [ ] Add method `cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean): Promise<Stripe.Subscription>`
- [ ] Add method `getSubscription(subscriptionId: string): Promise<Stripe.Subscription>`
- [ ] Handle Stripe API errors appropriately
- [ ] Typecheck passes

### US-006: Create Billing Calculation Service
**Description:** As a developer, I need a service to calculate billing amounts based on subscriber count using the pricing tier structure.

**Acceptance Criteria:**
- [ ] Create `BillingCalculationService` with method `calculateAmount(subscriberCount: number): number`
- [ ] Pricing logic: $5 for first 10,000 subscribers, then $1 per each additional 10,000 subscribers
- [ ] Examples: 5k subscribers = $5, 15k subscribers = $6, 25k subscribers = $7, 100k subscribers = $14
- [ ] Method returns calculated amount in dollars (decimal)
- [ ] Method handles edge cases (0 subscribers, very large numbers)
- [ ] Typecheck passes

### US-007: Create Billing Usage Tracking Service
**Description:** As a developer, I need a service to track and update the maximum subscriber count during each billing period.

**Acceptance Criteria:**
- [ ] Create `BillingUsageService` with method `updateUsage(userId: string, currentSubscriberCount: number): Promise<void>`
- [ ] Method finds or creates `BillingUsage` record for current billing period (month)
- [ ] Method updates `maxSubscriberCount` if current count is higher than stored max
- [ ] Billing period is calendar month (1st to last day of month)
- [ ] Method calculates billing amount using `BillingCalculationService`
- [ ] Method updates `calculatedAmount` field
- [ ] Typecheck passes

### US-008: Create Monthly Billing Job Processor
**Description:** As a developer, I need a scheduled job that runs at the end of each month to charge users based on their usage.

**Acceptance Criteria:**
- [ ] Create `BillingProcessor` that extends BullMQ processor
- [ ] Create scheduled job (cron: runs on 1st day of month at 00:00 UTC) to process monthly billing
- [ ] Job finds all users with active subscriptions
- [ ] For each user, job retrieves `BillingUsage` for previous month
- [ ] Job creates Stripe invoice item with calculated amount
- [ ] Job finalizes Stripe invoice and charges customer
- [ ] Job updates `BillingUsage` record with `stripeInvoiceId` and `status: 'invoiced'`
- [ ] Job creates new `BillingUsage` record for current month
- [ ] Job handles errors gracefully (logs, retries)
- [ ] Typecheck passes

### US-009: Create Stripe Webhook Handler
**Description:** As a developer, I need to handle Stripe webhooks to keep subscription status in sync with Stripe.

**Acceptance Criteria:**
- [ ] Create `POST /billing/webhook` endpoint in new `BillingController`
- [ ] Endpoint verifies Stripe webhook signature using `STRIPE_WEBHOOK_SECRET`
- [ ] Handle webhook events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
- [ ] Update `BillingSubscription` entity based on webhook events
- [ ] For subscription updates, sync status, period dates, and cancellation flags
- [ ] For invoice events, update `BillingUsage` records with payment status
- [ ] Endpoint returns 200 status for successful processing
- [ ] Endpoint handles errors and logs appropriately
- [ ] Typecheck passes

### US-010: Create Stripe Checkout Session Endpoint
**Description:** As a user, I want to connect my Stripe account during onboarding so I can start using the platform.

**Acceptance Criteria:**
- [ ] Add `POST /billing/create-checkout-session` endpoint to `BillingController`
- [ ] Endpoint requires authentication (use `@UseGuards(AuthGuard)`)
- [ ] Endpoint creates Stripe Checkout session for subscription
- [ ] Checkout session uses success URL: `/dashboard/settings?session_id={CHECKOUT_SESSION_ID}`
- [ ] Checkout session uses cancel URL: `/onboarding/stripe?canceled=true`
- [ ] Checkout session includes customer email from authenticated user
- [ ] Endpoint returns `{ url: string }` with checkout session URL
- [ ] Handle errors appropriately
- [ ] Typecheck passes

### US-011: Create Stripe Portal Session Endpoint
**Description:** As a user, I want to manage my subscription in Stripe so I can update payment methods, view invoices, and cancel if needed.

**Acceptance Criteria:**
- [ ] Add `POST /billing/create-portal-session` endpoint to `BillingController`
- [ ] Endpoint requires authentication
- [ ] Endpoint validates user has active Stripe customer
- [ ] Endpoint creates Stripe Customer Portal session
- [ ] Portal session return URL: `/dashboard/settings`
- [ ] Endpoint returns `{ url: string }` with portal session URL
- [ ] Handle errors appropriately
- [ ] Typecheck passes

### US-012: Create Billing Status Check Endpoint
**Description:** As a developer, I need an endpoint to check if a user has an active subscription so we can block sync/export functionality.

**Acceptance Criteria:**
- [ ] Add `GET /billing/status` endpoint to `BillingController`
- [ ] Endpoint requires authentication
- [ ] Endpoint returns `{ hasActiveSubscription: boolean, subscription: BillingSubscription | null, currentPeriodEnd: Date | null }`
- [ ] `hasActiveSubscription` is true if subscription status is 'active' and not canceled at period end
- [ ] Returns subscription details if exists
- [ ] Returns 401 if not authenticated
- [ ] Typecheck passes

### US-013: Create Current Usage Endpoint
**Description:** As a user, I want to see my current month's subscriber count and estimated billing so I can monitor my usage.

**Acceptance Criteria:**
- [ ] Add `GET /billing/usage` endpoint to `BillingController`
- [ ] Endpoint requires authentication
- [ ] Endpoint returns current month's `BillingUsage` record with: `maxSubscriberCount`, `calculatedAmount`, `billingPeriodStart`, `billingPeriodEnd`
- [ ] If no usage record exists for current month, creates one with current subscriber count
- [ ] Returns 401 if not authenticated
- [ ] Typecheck passes

### US-014: Create Billing History Endpoint
**Description:** As a user, I want to see my past billing periods and invoices so I can review my billing history.

**Acceptance Criteria:**
- [ ] Add `GET /billing/history` endpoint to `BillingController`
- [ ] Endpoint requires authentication
- [ ] Endpoint accepts optional query parameter `limit` (default: 12)
- [ ] Endpoint returns array of past `BillingUsage` records ordered by `billingPeriodStart` DESC
- [ ] Each record includes: `billingPeriodStart`, `billingPeriodEnd`, `maxSubscriberCount`, `calculatedAmount`, `status`, `stripeInvoiceId`
- [ ] Returns 401 if not authenticated
- [ ] Typecheck passes

### US-015: Add Subscription Check Guard
**Description:** As a developer, I need a guard to block sync and export endpoints when subscription is inactive.

**Acceptance Criteria:**
- [ ] Create `SubscriptionGuard` that implements `CanActivate`
- [ ] Guard checks if user has active subscription using `BillingSubscriptionService`
- [ ] Guard allows access if subscription is active and not canceled at period end
- [ ] Guard allows access if subscription is canceled but `currentPeriodEnd` is in the future (grace period)
- [ ] Guard throws `ForbiddenException` with message "Active subscription required" if subscription is inactive
- [ ] Apply guard to `POST /esp-connections/:id/sync` endpoint
- [ ] Apply guard to `GET /esp-connections/:id/subscribers/export` endpoint
- [ ] Typecheck passes

### US-016: Update Sync Service to Track Billing Usage
**Description:** As a developer, I need the sync service to update billing usage whenever subscribers are synced.

**Acceptance Criteria:**
- [ ] Update `SubscriberSyncService.syncSubscribers()` method
- [ ] After successful sync, count total subscribers for the user (sum across all ESP connections)
- [ ] Call `BillingUsageService.updateUsage(userId, totalSubscriberCount)`
- [ ] Update happens after all subscribers are processed
- [ ] Update happens even if some individual subscribers fail to process
- [ ] Typecheck passes

### US-017: Add Stripe Step to Onboarding Flow
**Description:** As a new user, I want to connect my Stripe account as the final step of onboarding so I can start using the platform.

**Acceptance Criteria:**
- [ ] Create new page at `src/app/onboarding/stripe/page.tsx`
- [ ] Page accessible after API key step in onboarding flow
- [ ] Page displays: heading "Connect your payment method", description explaining billing model, "Connect Stripe" button
- [ ] Button calls `POST /billing/create-checkout-session` endpoint
- [ ] On success, redirects user to Stripe Checkout URL
- [ ] After successful checkout, Stripe redirects to `/dashboard/settings?session_id=...`
- [ ] Settings page verifies session and completes onboarding
- [ ] If user cancels checkout, shows message and allows retry
- [ ] Page handles loading and error states
- [ ] Uses shadcn components (Button, Card)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-018: Update Onboarding Flow to Include Stripe Step
**Description:** As a developer, I need to update the onboarding flow to require Stripe connection before completing onboarding.

**Acceptance Criteria:**
- [ ] Update `src/app/onboarding/api-key/page.tsx` to redirect to `/onboarding/stripe` after ESP connection creation (instead of completing onboarding)
- [ ] Update onboarding completion logic to check for active subscription
- [ ] Only mark user as onboarded after Stripe subscription is active
- [ ] Update middleware to allow access to `/onboarding/stripe` for authenticated but not onboarded users
- [ ] Typecheck passes

### US-019: Create Billing Settings Page
**Description:** As a user, I want a settings page to view my billing information, usage, and manage my subscription.

**Acceptance Criteria:**
- [ ] Create settings page at `src/app/dashboard/settings/billing/page.tsx`
- [ ] Page displays current month usage card: shows max subscriber count, calculated amount, billing period dates
- [ ] Page displays subscription status card: shows subscription status, current period end date, cancel at period end flag (if applicable)
- [ ] Page displays "Manage Subscription" button that opens Stripe Customer Portal
- [ ] Page displays "View Invoices" button that opens Stripe Customer Portal (invoices section)
- [ ] Page displays billing history table: shows past 12 months with period dates, subscriber count, amount, status, invoice link
- [ ] Page handles loading and error states
- [ ] Uses shadcn components (Card, Table, Button)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-020: Add API Client Functions for Billing
**Description:** As a developer, I need API client functions for all billing endpoints so the frontend can interact with billing features.

**Acceptance Criteria:**
- [ ] Add `getBillingStatus()` function to API client
- [ ] Add `getCurrentUsage()` function to API client
- [ ] Add `getBillingHistory(limit?: number)` function to API client
- [ ] Add `createCheckoutSession()` function to API client
- [ ] Add `createPortalSession()` function to API client
- [ ] All functions include proper TypeScript types
- [ ] All functions handle authentication tokens and 401 errors
- [ ] Typecheck passes

### US-021: Add Account Deletion Entity and Migration
**Description:** As a developer, I need a way to track account deletion requests with soft delete and grace period.

**Acceptance Criteria:**
- [ ] Add `deletedAt` (timestamp, nullable) field to `User` entity
- [ ] Add `deleteRequestedAt` (timestamp, nullable) field to `User` entity
- [ ] Generate and run migration successfully
- [ ] Typecheck passes

### US-022: Create Account Deletion Endpoint
**Description:** As a user, I want to delete my account and all associated data after a 30-day grace period.

**Acceptance Criteria:**
- [ ] Add `POST /account/delete` endpoint to new `AccountController`
- [ ] Endpoint requires authentication
- [ ] Endpoint sets `deleteRequestedAt` timestamp on user
- [ ] Endpoint cancels Stripe subscription immediately (if exists)
- [ ] Endpoint returns success message
- [ ] Add scheduled job (runs daily) to check for users with `deleteRequestedAt` older than 30 days
- [ ] Job hard deletes user and all associated data: ESP connections, subscribers, sync history, billing records
- [ ] Job cancels Stripe subscription if still active
- [ ] Typecheck passes

### US-023: Create Account Settings Page with Deletion
**Description:** As a user, I want to see account settings and have the ability to delete my account.

**Acceptance Criteria:**
- [ ] Create account settings page at `src/app/dashboard/settings/account/page.tsx`
- [ ] Page displays user email (read-only)
- [ ] Page displays account deletion section with warning message
- [ ] Page displays "Delete Account" button with confirmation dialog
- [ ] Confirmation dialog explains: account will be deleted after 30 days, data can be exported during grace period, subscription will be canceled immediately
- [ ] On confirmation, calls `POST /account/delete` endpoint
- [ ] After deletion request, shows message: "Account deletion requested. You have 30 days to export your data. Your subscription has been canceled."
- [ ] Page handles loading and error states
- [ ] Uses shadcn components (Card, Button, Alert, Dialog)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-024: Block Access for Deleted Accounts
**Description:** As a developer, I need to block access to the platform for users who have requested account deletion.

**Acceptance Criteria:**
- [ ] Update `AuthGuard` to check if user has `deleteRequestedAt` set
- [ ] If `deleteRequestedAt` is set, throw `ForbiddenException` with message "Account deletion in progress. You can export your data for 30 days."
- [ ] Allow access to export endpoints during grace period
- [ ] Update middleware to redirect deleted accounts to a deletion notice page
- [ ] Typecheck passes

### US-025: Update Settings Navigation
**Description:** As a user, I want to navigate between different settings sections (Billing, Account) from the settings page.

**Acceptance Criteria:**
- [ ] Update settings page structure to include navigation tabs/sidebar
- [ ] Add "Billing" tab linking to `/dashboard/settings/billing`
- [ ] Add "Account" tab linking to `/dashboard/settings/account`
- [ ] Active tab is highlighted
- [ ] Navigation persists across page loads
- [ ] Uses shadcn Tabs or similar navigation component
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-026: Handle Stripe Checkout Success
**Description:** As a user, I want my subscription to be activated after successfully completing Stripe checkout.

**Acceptance Criteria:**
- [ ] Update settings page to check for `session_id` query parameter
- [ ] If `session_id` exists, call Stripe API to retrieve checkout session
- [ ] Verify session is completed and paid
- [ ] Create or update `BillingSubscription` record with subscription details
- [ ] If user is not onboarded, complete onboarding (set `isOnboarded: true`)
- [ ] Show success message: "Subscription activated successfully"
- [ ] Remove `session_id` from URL after processing
- [ ] Handle errors gracefully
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-027: Display Subscription Warning for Inactive Users
**Description:** As a user, I want to see a warning when my subscription is inactive so I know why I can't sync or export.

**Acceptance Criteria:**
- [ ] Add subscription status check to dashboard layout
- [ ] If subscription is inactive, display banner at top of dashboard: "Your subscription is inactive. Please update your payment method to continue syncing and exporting."
- [ ] Banner includes "Manage Subscription" button linking to billing settings
- [ ] Banner is dismissible (stores dismissal in localStorage)
- [ ] Banner reappears after 24 hours if subscription still inactive
- [ ] Uses shadcn Alert component
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-028: Disable Sync and Export Buttons for Inactive Subscription
**Description:** As a user, I want to see why sync and export buttons are disabled when my subscription is inactive.

**Acceptance Criteria:**
- [ ] Update ESP detail page to check subscription status on load
- [ ] If subscription is inactive, disable "Sync" button with tooltip: "Active subscription required to sync"
- [ ] If subscription is inactive, disable "Export" button with tooltip: "Active subscription required to export"
- [ ] Buttons show loading state while checking subscription status
- [ ] Uses shadcn Tooltip component
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Users must connect Stripe during onboarding before accessing the dashboard
- FR-2: Billing is calculated monthly based on the maximum subscriber count (sum across all publications) during each billing period
- FR-3: Pricing structure: $5 for first 10,000 subscribers, then $1 per each additional 10,000 subscribers
- FR-4: Monthly billing job runs on the 1st of each month to charge users for previous month's usage
- FR-5: Stripe webhooks keep subscription status synchronized with Stripe
- FR-6: Sync and export functionality is blocked when subscription is inactive
- FR-7: Users with canceled subscriptions retain access until end of current billing period
- FR-8: Settings page displays current month usage, subscription status, and billing history
- FR-9: Users can manage subscription and view invoices via Stripe Customer Portal
- FR-10: Account deletion sets 30-day grace period during which data can be exported
- FR-11: Account deletion immediately cancels Stripe subscription
- FR-12: After 30-day grace period, account and all associated data are permanently deleted
- FR-13: Billing usage is updated automatically after each successful sync

## Non-Goals

- No annual billing plans (monthly only)
- No prorated charges for mid-period subscription changes
- No refund processing (handled by Stripe)
- No manual invoice generation (all automated via Stripe)
- No multiple payment methods per account (managed in Stripe)
- No billing email notifications (handled by Stripe)
- No usage alerts or notifications before billing
- No discount codes or promotional pricing
- No team/organization billing (single user accounts only)

## Design Considerations

- Settings page should use existing dashboard design system (shadcn components)
- Billing settings should be clearly separated from account settings
- Usage display should be prominent and easy to understand
- Subscription status should be visible in dashboard header or sidebar
- Warning banners for inactive subscriptions should be non-intrusive but noticeable
- Account deletion should require explicit confirmation with clear warnings
- Stripe Checkout and Portal should handle all payment UI (no custom payment forms)

## Technical Considerations

- Stripe integration requires `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` environment variables
- Webhook endpoint must be publicly accessible (consider using ngrok for local development)
- Monthly billing job should use BullMQ scheduled jobs with cron expression
- Billing calculation must handle edge cases (0 subscribers, very large numbers)
- Subscription status checks should be cached to avoid excessive database queries
- Account deletion job should run daily to clean up expired deletion requests
- Stripe webhook verification is critical for security
- Consider rate limiting on billing endpoints to prevent abuse
- Database transactions should be used for billing operations to ensure data consistency

## Success Metrics

- 100% of onboarded users have active Stripe subscriptions
- Monthly billing job successfully processes all active subscriptions
- Zero billing calculation errors (verified through logging and monitoring)
- Webhook processing latency under 2 seconds
- Account deletion completes within 30 days for all requests
- Sync/export blocking works correctly for inactive subscriptions

## Open Questions

- Should we send email notifications when billing fails or subscription is canceled?
- Should we provide a way to manually trigger billing for testing?
- How should we handle Stripe test mode vs production mode?
- Should we track subscriber count changes over time for analytics?
- Should we allow users to see projected billing amount before period ends?
- How should we handle currency (USD only or multi-currency)?
