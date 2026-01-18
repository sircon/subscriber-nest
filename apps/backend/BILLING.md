# Billing Module Documentation

## Overview

The billing system implements usage-based subscription billing with Stripe integration. Users are charged monthly based on the maximum number of subscribers (summed across all their ESP connections) during each billing period.

## Pricing Model

**Tiered Pricing Structure:**
- **$5** for the first 10,000 subscribers
- **$1** per each additional 10,000 subscribers

**Examples:**
- 5,000 subscribers = $5
- 15,000 subscribers = $6 ($5 base + $1 for additional 10k)
- 25,000 subscribers = $7 ($5 base + $2 for additional 20k)
- 100,000 subscribers = $14 ($5 base + $9 for additional 90k)

**Implementation:** `BillingCalculationService.calculateAmount()`

## Architecture

### Key Components

#### 1. **BillingCalculationService** (`src/services/billing-calculation.service.ts`)
- Calculates billing amount based on subscriber count
- Implements tiered pricing logic
- Handles edge cases (0 subscribers, very large numbers)

#### 2. **BillingUsageService** (`src/services/billing-usage.service.ts`)
- Tracks maximum subscriber count during each billing period
- Creates/updates `BillingUsage` records for calendar months
- Calculates billing amounts using `BillingCalculationService`
- Filters billing history to show only past periods

#### 3. **BillingProcessor** (`src/processors/billing.processor.ts`)
- Scheduled job that runs on the 1st of each month at 00:00 UTC
- Processes billing for all users with active subscriptions
- Creates Stripe invoices and charges customers
- Updates billing usage records with invoice information

#### 4. **StripeService** (`src/services/stripe.service.ts`)
- Manages Stripe customer creation
- Creates and manages subscriptions
- Creates checkout sessions and customer portal sessions
- Handles invoice creation and finalization

#### 5. **BillingController** (`src/controllers/billing.controller.ts`)
- REST API endpoints for billing operations
- Webhook handler for Stripe events
- Checkout session creation
- Customer portal session creation
- Billing status, usage, and history endpoints

### Database Entities

#### **BillingSubscription** (`src/entities/billing-subscription.entity.ts`)
One-to-one relationship with User. Tracks:
- Stripe customer ID
- Stripe subscription ID
- Subscription status (active, canceled, past_due, etc.)
- Current billing period dates
- Cancellation flags

#### **BillingUsage** (`src/entities/billing-usage.entity.ts`)
One record per user per month. Tracks:
- `maxSubscriberCount`: Highest subscriber count during the billing period
- `calculatedAmount`: Billing amount for that month
- `status`: pending → invoiced → paid/failed
- `stripeInvoiceId`: Links to Stripe invoice
- `billingPeriodStart`/`billingPeriodEnd`: Calendar month boundaries

**Unique Constraint:** `userId + billingPeriodStart` (prevents duplicate records)

## Data Flow

### Real-Time Usage Tracking

```
User Syncs Subscribers
        │
        ▼
SubscriberSyncService.syncSubscribers()
  - Syncs subscribers from ESP
  - Counts total subscribers (sum across all ESP connections)
  - Calls BillingUsageService.updateUsage()
        │
        ▼
BillingUsageService.updateUsage()
  - Finds/creates BillingUsage for current month
  - Updates maxSubscriberCount (only if new count is higher)
  - Calculates amount via BillingCalculationService
  - Saves to database
```

**Key Point:** The system tracks the **maximum** subscriber count during the billing period, not the current count. This ensures users are charged for their peak usage.

### Monthly Billing Process

```
Monthly Billing Job (1st of month, 00:00 UTC)
        │
        ▼
BillingProcessor.process()
  For each active subscription:
    1. Get previous month's BillingUsage
    2. Create Stripe invoice item with calculated amount
    3. Finalize invoice (charge customer)
    4. Update BillingUsage: status='invoiced', store invoiceId
    5. Create new BillingUsage for current month
```

**Scheduling:** Uses BullMQ repeatable jobs with cron expression: `0 0 1 * *` (1st day of month at 00:00 UTC)

## Billing Period Structure

- **Calendar Month**: 1st day to last day of the month
- **One Record Per Month**: Each user has exactly one `BillingUsage` record per calendar month
- **Unique Constraint**: Prevents duplicate records for the same user/month

## Integration Points

### 1. Subscriber Sync Integration

When subscribers are synced (`SubscriberSyncService.syncSubscribers()`):
1. After successful sync, counts total subscribers across all user's ESP connections
2. Calls `BillingUsageService.updateUsage(userId, totalSubscriberCount)`
3. Updates happen even if some individual subscribers fail to process

### 2. Stripe Webhook Integration

Webhook events handled (`BillingController.handleWebhook()`):
- `customer.subscription.created` → Creates/updates `BillingSubscription`
- `customer.subscription.updated` → Updates subscription status and period dates
- `customer.subscription.deleted` → Marks subscription as canceled
- `invoice.paid` → Updates `BillingUsage.status = 'paid'`
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
- `STRIPE_PRICE_ID` - Stripe Price ID for subscriptions

## Key Features

### 1. Maximum Tracking
Only the highest subscriber count during a billing period is charged. If a user:
- Starts with 5,000 subscribers
- Grows to 15,000 mid-month
- Drops to 10,000 by month end

They are charged for 15,000 subscribers (the maximum).

### 2. Multi-ESP Support
Subscriber count is summed across **all** user's ESP connections. If a user has:
- beehiiv connection with 5,000 subscribers
- Kit connection with 3,000 subscribers

Total count = 8,000 subscribers for billing purposes.

### 3. Grace Period
Users with canceled subscriptions retain access until `currentPeriodEnd`. The `SubscriptionGuard` checks:
- Subscription is active, OR
- Subscription is canceled but `currentPeriodEnd` is in the future

### 4. Idempotent Billing
Monthly billing job:
- Skips records already marked as `invoiced`
- Can be safely re-run if needed
- Logs warnings for missing usage records (doesn't fail entire job)

### 5. Error Handling
- Individual user billing failures don't stop the entire job
- Failed invoices are marked with `status = 'failed'`
- Webhook events update payment status automatically

## Frontend Integration

### Current Month Usage
- Displays `maxSubscriberCount` and `calculatedAmount` for current month
- Updates in real-time as subscribers are synced

### Billing History
- Shows past 12 months of billing periods
- Filtered to exclude future periods (`billingPeriodStart <= current date`)
- Displays period dates, subscriber count, amount, status, and invoice links

### Subscription Status
- Shows active/canceled status
- Displays current period end date
- Shows cancellation flags if applicable

## Testing Considerations

### Manual Billing Trigger
For testing, you can manually trigger billing by:
1. Creating a job in the billing queue with `MonthlyBillingJobData`
2. Specifying `billingPeriodStart` and `billingPeriodEnd` in job data
3. The processor will use these dates instead of calculating from current date

### Stripe Test Mode
- Use Stripe test keys for development
- Test webhooks using Stripe CLI: `stripe listen --forward-to localhost:4000/billing/webhook`
- Test checkout sessions with test card numbers

## Troubleshooting

### Common Issues

1. **Billing job not running**
   - Check BullMQ queue status
   - Verify cron schedule in `BillingSchedulerService`
   - Check logs for job execution

2. **Webhook not receiving events**
   - Verify `STRIPE_WEBHOOK_SECRET` is correct
   - Check webhook endpoint is publicly accessible
   - Use Stripe CLI for local testing

3. **Invoices not being created**
   - Verify `STRIPE_PRICE_ID` is configured
   - Check user has active subscription
   - Verify `BillingUsage` record exists for previous month

4. **Usage not updating**
   - Check sync is completing successfully
   - Verify `BillingUsageService.updateUsage()` is being called
   - Check database for `BillingUsage` records

## Related Files

- `src/services/billing-calculation.service.ts` - Pricing calculation
- `src/services/billing-usage.service.ts` - Usage tracking
- `src/services/billing-subscription.service.ts` - Subscription management
- `src/services/stripe.service.ts` - Stripe API integration
- `src/controllers/billing.controller.ts` - API endpoints
- `src/processors/billing.processor.ts` - Monthly billing job
- `src/guards/subscription.guard.ts` - Subscription access control
- `src/entities/billing-subscription.entity.ts` - Subscription entity
- `src/entities/billing-usage.entity.ts` - Usage tracking entity
