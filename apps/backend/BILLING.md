# Billing Module Documentation

## Overview

The billing system implements usage-based subscription billing with Stripe metered billing integration. Users are charged monthly based on the maximum number of subscribers per publication (summed across all their ESP connections) during each billing period. Usage is reported to Stripe meters in real-time after each sync, and Stripe automatically handles invoicing at the end of each billing period.

## Pricing Model

**Metered Billing Structure:**
- Usage is measured in units of 10,000 subscribers
- Each unit represents 10,000 subscribers (rounded up)
- Stripe handles pricing based on the meter configuration

**Unit Calculation:**
- Subscriber count is converted to 10k units using `Math.ceil()` (always rounds up)
- Examples:
  - 5,000 subscribers = 1 unit (5,000 / 10,000 = 0.5 → 1)
  - 15,000 subscribers = 2 units (15,000 / 10,000 = 1.5 → 2)
  - 20,000 subscribers = 2 units (20,000 / 10,000 = 2.0 → 2)
  - 25,000 subscribers = 3 units (25,000 / 10,000 = 2.5 → 3)
  - 100,000 subscribers = 10 units (100,000 / 10,000 = 10.0 → 10)

**Implementation:** `BillingUsageService.calculateMeterUsage()`

## Architecture

### Key Components

#### 1. **BillingUsageService** (`src/services/billing-usage.service.ts`)
- Tracks maximum subscriber count per publication during each billing period
- Calculates per-publication maximums from SyncHistory records
- Converts total usage to 10k units (rounded up) for Stripe meter
- Creates/updates `BillingUsage` records for calendar months
- Filters billing history to show only past periods

#### 2. **StripeService** (`src/services/stripe.service.ts`)
- Manages Stripe customer creation
- Creates subscriptions with metered billing using Stripe meter
- Reports usage to Stripe meter after each sync
- Creates checkout sessions and customer portal sessions
- Handles webhook events

#### 3. **SubscriberSyncService** (`src/services/subscriber-sync.service.ts`)
- Syncs subscribers from ESPs to database
- After each successful sync, calculates per-publication max usage
- Reports usage to Stripe meter in real-time
- Handles meter reporting errors gracefully (doesn't fail sync)

#### 4. **BillingController** (`src/controllers/billing.controller.ts`)
- REST API endpoints for billing operations
- Webhook handler for Stripe events
- Checkout session creation
- Customer portal session creation
- Billing status, usage, and history endpoints

#### 5. **BillingProcessor** (`src/processors/billing.processor.ts`)
- Simplified monthly job (if still needed for historical tracking)
- Note: Stripe handles invoicing automatically for metered billing
- May be used for creating usage records for historical purposes only

### Database Entities

#### **BillingSubscription** (`src/entities/billing-subscription.entity.ts`)
One-to-one relationship with User. Tracks:
- Stripe customer ID
- Stripe subscription ID
- **Stripe subscription item ID** (required for meter reporting)
- Subscription status (active, canceled, past_due, etc.)
- Current billing period dates
- Cancellation flags

#### **BillingUsage** (`src/entities/billing-usage.entity.ts`)
One record per user per month. Tracks:
- `maxSubscriberCount`: Sum of maximum subscriber counts from all publications
- `calculatedAmount`: Billing amount for that month (for display purposes)
- `status`: pending → invoiced → paid/failed (updated via webhooks)
- `stripeInvoiceId`: Links to Stripe invoice (populated by webhooks)
- `billingPeriodStart`/`billingPeriodEnd`: Calendar month boundaries

**Unique Constraint:** `userId + billingPeriodStart` (prevents duplicate records)

#### **SyncHistory** (`src/entities/sync-history.entity.ts`)
Tracks each sync operation. Includes:
- `subscriberCount`: Subscriber count at the time of sync (used for per-publication max calculation)
- `espConnectionId`: Links to ESP connection
- `status`: success or failed
- `startedAt`/`completedAt`: Sync timing

## Data Flow

### Real-Time Usage Tracking and Meter Reporting

```
User Syncs Subscribers
        │
        ▼
SubscriberSyncProcessor.process()
  - Syncs subscribers from ESP
  - Records subscriber count in SyncHistory
        │
        ▼
SubscriberSyncService.syncSubscribers()
  - After successful sync:
    1. Counts total subscribers (for BillingUsage tracking)
    2. Calculates per-publication max usage for current billing period
    3. Sums maximums from all publications
    4. Converts to 10k units (rounded up)
    5. Reports to Stripe meter
        │
        ├─► BillingUsageService.updateUsage()
        │   - Updates maxSubscriberCount (sum of all publications)
        │   - Saves to database
        │
        └─► StripeService.reportUsageToMeter()
            - Reports usage units to Stripe meter
            - Stripe uses "last value" for billing period
```

**Key Points:**
1. **Per-Publication Maximum**: For each ESP connection, finds the maximum subscriber count during the billing period from SyncHistory records
2. **Sum of Maximums**: Sums the maximum from each publication (not the current total)
3. **10k Unit Conversion**: Always rounds up (25,000 = 3 units, not 2.5)
4. **Real-Time Reporting**: Usage is reported to Stripe immediately after each sync
5. **Stripe Handles Billing**: Stripe automatically invoices at the end of the billing period based on the last reported usage value

### Per-Publication Maximum Calculation

```
For each ESP connection (publication):
  1. Query SyncHistory records within billing period
  2. Find maximum subscriberCount from successful syncs
  3. If no sync history, use current subscriber count as fallback
  4. Store max per connection in Map<connectionId, maxCount>

Sum all maximums:
  totalMax = sum(maxCount for each connection)

Convert to 10k units:
  units = Math.ceil(totalMax / 10000)

Report to Stripe meter:
  Stripe uses the last reported value for the billing period
```

### Monthly Billing (Automatic by Stripe)

```
End of Billing Period
        │
        ▼
Stripe automatically:
  1. Uses last reported usage value from meter
  2. Calculates invoice amount based on meter pricing
  3. Charges customer
  4. Sends webhook events (invoice.paid, invoice.payment_failed)
        │
        ▼
BillingController.handleWebhook()
  - Updates BillingUsage.status based on invoice events
  - Links invoice ID to BillingUsage record
```

**Note:** No manual monthly billing job is needed. Stripe handles invoicing automatically for metered billing.

## Billing Period Structure

- **Calendar Month**: 1st day to last day of the month
- **One Record Per Month**: Each user has exactly one `BillingUsage` record per calendar month
- **Unique Constraint**: Prevents duplicate records for the same user/month
- **Stripe Billing**: Stripe uses the last reported usage value during the period for invoicing

## Integration Points

### 1. Subscriber Sync Integration

When subscribers are synced (`SubscriberSyncService.syncSubscribers()`):

1. **Sync Process**:
   - Fetches subscribers from ESP
   - Stores/updates subscribers in database
   - Records subscriber count in `SyncHistory.subscriberCount`

2. **Usage Calculation**:
   - Calculates per-publication max usage for current billing period
   - Uses `BillingUsageService.calculatePerPublicationMaxUsage()` to find max per ESP connection
   - Sums maximums from all publications
   - Converts to 10k units using `BillingUsageService.calculateMeterUsage()`

3. **Meter Reporting**:
   - Gets user's subscription and subscription item ID
   - Calls `StripeService.reportUsageToMeter()` with calculated units
   - Errors are logged but don't fail the sync operation

4. **Usage Tracking**:
   - Updates `BillingUsage` record with total subscriber count (for display purposes)

### 2. Stripe Webhook Integration

Webhook events handled (`BillingController.handleWebhook()`):
- `customer.subscription.created` → Creates/updates `BillingSubscription`, stores subscription item ID
- `customer.subscription.updated` → Updates subscription status, period dates, and subscription item ID
- `customer.subscription.deleted` → Marks subscription as canceled
- `invoice.paid` → Updates `BillingUsage.status = 'paid'`, links invoice ID
- `invoice.payment_failed` → Updates `BillingUsage.status = 'failed'`

### 3. Subscription Guard

`SubscriptionGuard` (`src/guards/subscription.guard.ts`):
- Blocks sync and export endpoints when subscription is inactive
- Allows access during grace period (canceled but `currentPeriodEnd` is in future)
- Applied to:
  - `POST /esp-connections/:id/sync`
  - `GET /esp-connections/:id/subscribers/export`

## API Endpoints

### Billing Management
- `POST /billing/create-checkout-session` - Create Stripe checkout session
- `POST /billing/create-portal-session` - Create Stripe customer portal session
- `GET /billing/status` - Get subscription status
- `GET /billing/usage` - Get current month usage
- `GET /billing/history` - Get billing history (past 12 months)

### Webhooks
- `POST /billing/webhook` - Stripe webhook handler (verifies signature)

## Environment Variables

Required Stripe configuration:
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification secret
- `STRIPE_METER_ID` - Stripe meter ID for usage-based billing (e.g., `mtr_test_61U0JOA60MfGd9xVI41L1FsRxaYQT7S4`)

**Note:** `STRIPE_PRICE_ID` is no longer used with metered billing. The meter ID is used instead.

## Key Features

### 1. Per-Publication Maximum Tracking
For each ESP connection (publication), the system tracks the maximum subscriber count during the billing period. The maximums are then summed across all publications.

**Example:**
- Publication A: Max 5,000 subscribers during period
- Publication B: Max 3,000 subscribers during period
- **Total for billing: 8,000 subscribers = 1 unit** (8,000 / 10,000 = 0.8 → 1)

### 2. Real-Time Meter Reporting
Usage is reported to Stripe meter immediately after each sync. Stripe uses the **last reported value** during the billing period for invoicing.

**Important:** If a user syncs multiple times during a period, only the last reported value is used for billing. This means:
- If user reports 2 units, then 3 units, then 1 unit → Stripe bills for 1 unit (last value)
- The system should report the maximum usage, not incremental changes

### 3. Round-Up Logic
Always rounds up to the nearest 10k unit:
- 25,000 subscribers = 3 units (not 2.5)
- 15,000 subscribers = 2 units (not 1.5)
- 20,000 subscribers = 2 units (exactly 2.0)

### 4. Multi-ESP Support
Subscriber count is calculated per publication, then summed:
- Each ESP connection is tracked separately
- Maximum subscriber count per connection during the period
- Sum of all maximums = total for billing

### 5. Grace Period
Users with canceled subscriptions retain access until `currentPeriodEnd`. The `SubscriptionGuard` checks:
- Subscription is active, OR
- Subscription is canceled but `currentPeriodEnd` is in the future

### 6. Error Handling
- Meter reporting errors are logged but don't fail the sync operation
- Sync can complete successfully even if meter reporting fails
- Webhook events update payment status automatically

## Frontend Integration

### Current Month Usage
- Displays `maxSubscriberCount` (sum of per-publication maximums) for current month
- Shows calculated amount (for display purposes)
- Updates in real-time as subscribers are synced

### Billing History
- Shows past 12 months of billing periods
- Filtered to exclude future periods (`billingPeriodStart <= current date`)
- Displays period dates, subscriber count, amount, status, and invoice links
- Invoice links open Stripe customer portal

### Subscription Status
- Shows active/canceled status
- Displays current period end date
- Shows cancellation flags if applicable

## Meter Reporting Details

### How Stripe Meters Work
- Stripe meters track usage over time
- Usage is reported via `subscriptionItems.createUsageRecord()`
- Stripe uses the **last reported value** during the billing period for invoicing
- Multiple reports in the same period overwrite previous values (last one wins)

### Reporting Strategy
After each sync:
1. Calculate current maximum usage (per-publication max, summed, converted to units)
2. Report to Stripe meter with current timestamp
3. Stripe stores this as the latest usage value
4. At period end, Stripe invoices based on the last reported value

**Important Consideration:** Since Stripe uses the last value, the system should report the maximum usage seen during the period, not incremental changes. The current implementation calculates the max from SyncHistory, which ensures the correct maximum is reported.

## Testing Considerations

### Stripe Test Mode
- Use Stripe test keys for development
- Test meter ID: `mtr_test_61U0JOA60MfGd9xVI41L1FsRxaYQT7S4`
- Test webhooks using Stripe CLI: `stripe listen --forward-to localhost:4000/billing/webhook`
- Test checkout sessions with test card numbers

### Manual Meter Testing
- Trigger syncs and verify usage is reported to Stripe
- Check Stripe dashboard to see usage records
- Verify invoices are created automatically at period end

## Troubleshooting

### Common Issues

1. **Usage not being reported to meter**
   - Check `STRIPE_METER_ID` is configured correctly
   - Verify subscription has `stripeSubscriptionItemId` set
   - Check sync is completing successfully
   - Review logs for meter reporting errors

2. **Webhook not receiving events**
   - Verify `STRIPE_WEBHOOK_SECRET` is correct
   - Check webhook endpoint is publicly accessible
   - Use Stripe CLI for local testing

3. **Invoices not being created**
   - Stripe handles invoicing automatically for metered billing
   - Check Stripe dashboard for subscription status
   - Verify usage records are being reported (check Stripe dashboard)
   - Check subscription is active

4. **Incorrect usage amounts**
   - Verify per-publication max calculation is working
   - Check SyncHistory records have `subscriberCount` populated
   - Verify 10k unit conversion (should always round up)
   - Check that maximums are being calculated correctly per publication

5. **Subscription item ID missing**
   - Check webhook handlers are storing subscription item ID
   - Verify subscription was created with meter (not price ID)
   - Check `BillingSubscription.stripeSubscriptionItemId` field

## Related Files

- `src/services/billing-usage.service.ts` - Usage tracking and meter calculation
- `src/services/billing-subscription.service.ts` - Subscription management
- `src/services/stripe.service.ts` - Stripe API integration and meter reporting
- `src/services/subscriber-sync.service.ts` - Sync integration with meter reporting
- `src/controllers/billing.controller.ts` - API endpoints and webhooks
- `src/processors/billing.processor.ts` - Monthly billing job (simplified for metered billing)
- `src/guards/subscription.guard.ts` - Subscription access control
- `src/entities/billing-subscription.entity.ts` - Subscription entity
- `src/entities/billing-usage.entity.ts` - Usage tracking entity
- `src/entities/sync-history.entity.ts` - Sync history with subscriber count tracking