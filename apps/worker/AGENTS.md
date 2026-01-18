# Worker Service agents

NestJS background worker service in `apps/worker`: processes queue jobs and runs cron jobs. Listens to events from API service.

## Modules / areas

| Area | Responsibility |
|-----|----------------|
| **AppModule** | Root module: `ConfigModule`, `TypeOrmModule` (Postgres), `BullModule` (processors), `ScheduleModule` (cron jobs), `EventEmitterModule` (event listeners). |
| **TypeORM / DB** | Postgres via TypeORM. Entities imported from `@subscriber-nest/shared/entities`. |
| **Processors** | BullMQ queue processors (SubscriberSyncProcessor, BillingProcessor, AccountDeletionProcessor). |
| **Schedulers** | Cron job schedulers (SyncSchedulerService, BillingSchedulerService, AccountDeletionSchedulerService). |
| **Event Listeners** | Services that listen to events from API service (SyncEventListenerService). |
| **Services** | Business logic services used by processors (SubscriberSyncService, SubscriberMapperService, etc.). |

## Important paths

- `src/main.ts` – bootstrap (no HTTP server, only processes jobs and runs cron jobs).  
- `src/app.module.ts` – TypeORM, BullMQ (processors), ScheduleModule, EventEmitterModule, all processors, schedulers, and services.  
- `src/processors/` – BullMQ queue processors (subscriber-sync, billing, account-deletion).  
- `src/services/` – Injectable services (SubscriberSyncService, SubscriberMapperService, SyncSchedulerService, etc.).  
- `src/connectors/` – ESP connectors (BeehiivConnector).  
- Entities are in `packages/shared/src/entities/` – Import using `@subscriber-nest/shared/entities` (e.g., `Subscriber`, `EspConnection`).  
- Shared services are in `packages/shared/src/services/` – Import using `@subscriber-nest/shared/services` (e.g., `EncryptionService`).  
- Events are in `packages/shared/src/events/` – Import using `@subscriber-nest/shared/events` (e.g., `SyncRequestedEvent`).  

## Env (see `.env.example` or root README)

- `DATABASE_*` – Postgres connection (shared with API).  
- `REDIS_*` – Redis connection for BullMQ (shared with API).  
- `ENCRYPTION_KEY` – Encryption key for sensitive data (shared with API).  
- `NODE_ENV` – e.g. `development` / `production`; `synchronize` is off in production.  

## Event Listening

- Worker service listens to events from API service using `@OnEvent('EventClassName')` decorator.
- Event listener services must be registered in AppModule providers.
- Event classes are in `packages/shared/src/events/` – Import using `@subscriber-nest/shared/events`.
- Example: `@OnEvent('SyncRequestedEvent') handleSyncRequested(event: SyncRequestedEvent)`.
- Event listeners typically add jobs to queues when events are received.

## BullMQ Processors

- Processors extend `WorkerHost` from `@nestjs/bullmq` and use `@Processor('queue-name')` decorator.
- In `@nestjs/bullmq` v11, implement `process(job: Job<JobData>)` method and check `job.name` to handle specific job types (the `@Process` decorator is not available).
- Processors must be registered in the module's `providers` array.
- Re-throw errors so BullMQ can handle retries according to the queue's retry policy.
- Use `job.attemptsMade` and `job.opts.attempts` to detect final retry attempt. Pattern: `const isFinalAttempt = job.attemptsMade >= (job.opts.attempts || 1)`.
- Only record permanent failure status after all retries exhausted to avoid logging intermediate retry failures.

## Cron Jobs

- Use `@Cron()` decorator from `@nestjs/schedule` for scheduling cron jobs.
- Cron jobs run automatically once the service is registered in AppModule providers.
- Cron pattern examples:
  - `'0 0 * * *'` – Daily at 00:00 UTC
  - `'0 0 1 * *'` – Monthly on 1st day at 00:00 UTC
- Use `{ timeZone: 'UTC' }` option to specify timezone.
- Cron methods should handle errors gracefully (log but don't crash).
- Cron jobs typically add jobs to queues rather than processing directly.

## Schedulers

- **SyncSchedulerService**: Runs daily at midnight UTC, queues all active ESP connections for syncing.
- **BillingSchedulerService**: Runs monthly on 1st day at 00:00 UTC, queues monthly billing jobs.
- **AccountDeletionSchedulerService**: Runs daily at 00:00 UTC, queues account deletion jobs.
- All schedulers use `@Cron()` decorator and add jobs to queues.

## Subscriber Sync

- `SubscriberSyncProcessor` processes `sync-publication` jobs from `subscriber-sync` queue.
- `SubscriberSyncService` handles the sync logic (fetching from ESP, comparing with local DB, applying changes).
- `SubscriberMapperService` maps ESP subscriber data to local subscriber format.
- `SyncHistoryService` records sync history for tracking and debugging.
- Sync can be triggered manually (via API event) or automatically (via midnight cron job).

## Billing

- `BillingProcessor` processes monthly billing jobs from `billing` queue.
- `BillingSchedulerService` queues monthly billing jobs on 1st day of each month.
- Billing services (BillingUsageService, BillingCalculationService, BillingSubscriptionService, StripeService) handle usage calculation and Stripe integration.

## Account Deletion

- `AccountDeletionProcessor` processes account deletion jobs from `account-deletion` queue.
- `AccountDeletionSchedulerService` queues account deletion jobs daily for accounts marked for deletion.
- Handles cleanup of user data, subscriptions, and related records.

## Encryption

- EncryptionService is in `packages/shared/src/services/` – Import using `@subscriber-nest/shared/services`
- EncryptionService uses Node's built-in crypto module with AES-256-GCM
- Always decrypt sensitive data (like API keys) before using them in processors and services

## Scripts

- `dev` – `nest start --watch` (processes jobs and runs cron jobs)  
- `build` – `nest build`  
- `start` – `node dist/main.js`  

## Patterns

- **Services with TypeORM**: Use `@InjectRepository(Entity)` to inject repositories. Register entities with `TypeOrmModule.forFeature([Entity])` in the module. Entities are imported from `@subscriber-nest/shared/entities`.
- **BullMQ processors**: Processors extend `WorkerHost` and use `@Processor('queue-name')` decorator. Implement `process(job: Job<JobData>)` method and check `job.name` for specific job types. Register processors in AppModule providers.
- **BullMQ retry handling**: Use `job.attemptsMade` and `job.opts.attempts` to detect final retry attempt. Only record permanent failure status after all retries exhausted.
- **Cron jobs**: Use `@Cron()` decorator from `@nestjs/schedule`. Cron jobs run automatically once registered in AppModule providers. Handle errors gracefully (log but don't crash).
- **Event listeners**: Use `@OnEvent('EventClassName')` decorator to listen to events. Event listener services must be registered in AppModule providers. Typically add jobs to queues when events are received.
- **Shared package imports**: Always use `@subscriber-nest/shared/*` path aliases for entities, services, and events. Do not use relative imports to shared package from worker service.
