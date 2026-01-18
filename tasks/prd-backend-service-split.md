# PRD: Backend Service Split and Midnight Sync Cron Job

## Introduction

Currently, the SubscriberNest backend is a single NestJS application that handles both API requests and queue processing. This creates a bottleneck where long-running sync operations can block API responses, and API load can impact queue processing performance. 

This PRD outlines splitting the backend into two independent services:
1. **API Service** (`apps/api`) - Handles HTTP requests, authentication, and business logic
2. **Worker Service** (`apps/worker`) - Handles queue processing, cron jobs, and background tasks

Additionally, we'll implement a cron job that runs every midnight UTC to automatically queue all active ESP connections for syncing, ensuring subscriber data stays fresh without manual intervention.

## Goals

- Split the monolithic backend into two independent NestJS services that can scale and deploy separately
- Create a shared package for entities, DTOs, and common services to avoid code duplication
- Implement a midnight UTC cron job that automatically queues all active ESP connections for syncing
- Enable event-based communication between API and Worker services
- Maintain backward compatibility: API service can still trigger syncs manually (processed by worker)
- Ensure both services can run independently without blocking each other
- Follow NestJS best practices for microservices architecture

## User Stories

### US-001: Create Shared Package Structure
**Description:** As a developer, I need a shared package containing entities, DTOs, and common services so both API and Worker services can use the same code without duplication.

**Acceptance Criteria:**
- [ ] Create `packages/shared` directory in monorepo root
- [ ] Move all entities from `apps/backend/src/entities/` to `packages/shared/src/entities/`
- [ ] Move all DTOs from `apps/backend/src/dto/` to `packages/shared/src/dto/`
- [ ] Move common services (EncryptionService, etc.) to `packages/shared/src/services/`
- [ ] Create `packages/shared/package.json` with proper exports
- [ ] Configure TypeScript paths/aliases for shared package
- [ ] Update root `package.json` workspaces to include `packages/shared`
- [ ] Typecheck passes

### US-002: Create API Service Application
**Description:** As a developer, I need a dedicated API service that handles all HTTP requests, controllers, and business logic, separate from queue processing.

**Acceptance Criteria:**
- [ ] Create `apps/api` directory with NestJS application structure
- [ ] Copy controllers from `apps/backend/src/controllers/` to `apps/api/src/controllers/`
- [ ] Copy API-specific services to `apps/api/src/services/`
- [ ] Import shared entities and DTOs from `packages/shared`
- [ ] Configure TypeORM to connect to same database as before
- [ ] Remove all queue processors and workers from API service
- [ ] Keep BullMQ queue producers (for adding jobs) but not workers
- [ ] Update `apps/api/package.json` with dependencies
- [ ] Create `apps/api/src/main.ts` that starts HTTP server
- [ ] API service starts on port from `PORT` env var (default 4000)
- [ ] Typecheck passes

### US-003: Create Worker Service Application
**Description:** As a developer, I need a dedicated worker service that handles all queue processing, cron jobs, and background tasks, separate from API requests.

**Acceptance Criteria:**
- [ ] Create `apps/worker` directory with NestJS application structure
- [ ] Copy all processors from `apps/backend/src/processors/` to `apps/worker/src/processors/`
- [ ] Copy worker-specific services to `apps/worker/src/services/`
- [ ] Import shared entities and DTOs from `packages/shared`
- [ ] Configure TypeORM to connect to same database as API service
- [ ] Configure BullMQ workers (not just producers) for all queues
- [ ] Remove all HTTP controllers from worker service
- [ ] Update `apps/worker/package.json` with dependencies
- [ ] Create `apps/worker/src/main.ts` that starts worker (no HTTP server)
- [ ] Worker service does not expose HTTP endpoints
- [ ] Typecheck passes

### US-004: Implement Event-Based Communication
**Description:** As a developer, I need event-based communication between API and Worker services so they can communicate asynchronously without direct coupling.

**Acceptance Criteria:**
- [ ] Install `@nestjs/event-emitter` in both API and Worker services
- [ ] Create event classes/interfaces in `packages/shared/src/events/`
- [ ] API service publishes events when syncs are triggered manually
- [ ] Worker service subscribes to events and processes them
- [ ] Use Redis pub/sub or BullMQ events for cross-service communication
- [ ] Events include: `SyncRequestedEvent` with `espConnectionId`
- [ ] Worker service logs received events
- [ ] Typecheck passes

### US-005: Install and Configure NestJS Schedule Module
**Description:** As a developer, I need the NestJS Schedule module configured in the worker service so I can create cron jobs.

**Acceptance Criteria:**
- [ ] Install `@nestjs/schedule` package in `apps/worker`
- [ ] Import `ScheduleModule.forRoot()` in worker service `AppModule`
- [ ] Verify schedule module is properly initialized
- [ ] Typecheck passes

### US-006: Create Midnight Sync Scheduler Service
**Description:** As a system, I need a cron job that runs every midnight UTC to automatically queue all active ESP connections for syncing.

**Acceptance Criteria:**
- [ ] Create `SyncSchedulerService` in `apps/worker/src/services/`
- [ ] Use `@Cron('0 0 * * *', { timeZone: 'UTC' })` decorator for midnight UTC schedule
- [ ] Service queries database for all ESP connections where `status = 'active'`
- [ ] For each active connection, adds a `sync-publication` job to `subscriber-sync` queue
- [ ] Logs number of connections queued for sync
- [ ] Handles errors gracefully (logs but doesn't crash)
- [ ] Service is registered in worker service `AppModule` providers
- [ ] Typecheck passes

### US-007: Update Turbo Configuration for New Services
**Description:** As a developer, I need the monorepo build system to recognize and build the new API and Worker services.

**Acceptance Criteria:**
- [ ] Update `turbo.json` to include `apps/api` and `apps/worker` in build tasks
- [ ] Update root `package.json` scripts if needed
- [ ] Verify `turbo run build` builds both services
- [ ] Verify `turbo run dev` can run both services simultaneously
- [ ] Update documentation in root `README.md` about new service structure

### US-008: Update Environment Configuration
**Description:** As a developer, I need environment variables properly configured for both services to run independently.

**Acceptance Criteria:**
- [ ] Create `apps/api/.env.example` with API-specific env vars
- [ ] Create `apps/worker/.env.example` with worker-specific env vars
- [ ] Document which env vars are shared (DATABASE_*, REDIS_*) vs service-specific
- [ ] Both services can read from `.env` files independently
- [ ] Update root README with new environment setup instructions

### US-009: Migrate Existing Schedulers to Worker Service
**Description:** As a developer, I need existing schedulers (billing, account-deletion) moved to worker service and converted to use `@nestjs/schedule` instead of BullMQ repeatable jobs.

**Acceptance Criteria:**
- [ ] Move `BillingSchedulerService` to worker service
- [ ] Convert billing scheduler from BullMQ repeatable jobs to `@Cron()` decorator
- [ ] Move `AccountDeletionSchedulerService` to worker service
- [ ] Convert account deletion scheduler from BullMQ repeatable jobs to `@Cron()` decorator
- [ ] Remove `OnModuleInit` pattern, use `@Cron()` decorators instead
- [ ] Verify cron jobs still run at correct times
- [ ] Typecheck passes

### US-010: Update API Service to Publish Sync Events
**Description:** As a user, I want to trigger manual syncs from the API, which should be processed by the worker service via events.

**Acceptance Criteria:**
- [ ] Update `EspConnectionController.triggerSync()` to publish `SyncRequestedEvent`
- [ ] Event includes `espConnectionId` and `userId`
- [ ] API service still returns immediate response (202 Accepted)
- [ ] Remove direct queue job addition from API controller
- [ ] Worker service subscribes to event and adds job to queue
- [ ] Manual syncs work end-to-end
- [ ] Typecheck passes

### US-011: Remove Old Backend Application
**Description:** As a developer, I need the old monolithic backend removed after migration is complete and verified.

**Acceptance Criteria:**
- [ ] Verify API service handles all HTTP endpoints correctly
- [ ] Verify Worker service processes all queues correctly
- [ ] Verify cron jobs run correctly
- [ ] Remove `apps/backend` directory
- [ ] Update any documentation referencing old backend
- [ ] Update CI/CD pipelines if they reference old backend path

## Functional Requirements

- FR-1: Create `packages/shared` package containing all entities, DTOs, and common services
- FR-2: Create `apps/api` NestJS application with all HTTP controllers and API-specific services
- FR-3: Create `apps/worker` NestJS application with all queue processors, cron jobs, and background services
- FR-4: Both services import shared code from `packages/shared` package
- FR-5: Both services connect to the same PostgreSQL database
- FR-6: API service uses BullMQ to produce jobs (add to queues) but does not process them
- FR-7: Worker service uses BullMQ to consume and process jobs from all queues
- FR-8: Worker service uses `@nestjs/schedule` with `@Cron()` decorators for scheduled tasks
- FR-9: Cron job runs every midnight UTC (`0 0 * * *` pattern with UTC timezone)
- FR-10: Midnight cron job queries all ESP connections where `status = 'active'` and queues them for sync
- FR-11: API service publishes events when manual syncs are triggered
- FR-12: Worker service subscribes to events and processes them by adding jobs to queues
- FR-13: Existing schedulers (billing, account-deletion) are migrated to worker service and use `@Cron()` decorators
- FR-14: Both services can run independently without blocking each other
- FR-15: Both services can be built, deployed, and scaled independently

## Non-Goals

- **Separate databases**: Both services will share the same PostgreSQL database
- **HTTP communication between services**: Services communicate via events/queues, not direct HTTP calls
- **Separate Redis instances**: Both services connect to the same Redis instance for BullMQ
- **API Gateway**: No API gateway layer is required for this split
- **Service discovery**: Services are configured via environment variables, no service discovery needed
- **GraphQL**: This PRD does not include GraphQL implementation
- **WebSocket support**: Real-time features are out of scope
- **Multiple worker instances**: This PRD assumes single worker instance (horizontal scaling can be added later)

## Design Considerations

### Architecture Pattern
- **Microservices Lite**: Two services that share a database (not full microservices with separate databases)
- **Event-Driven**: API publishes events, Worker subscribes and processes
- **Shared Database**: Both services read/write to same PostgreSQL database (simpler than separate DBs with sync)

### Service Responsibilities

**API Service (`apps/api`):**
- HTTP request handling (controllers)
- Authentication and authorization
- Business logic services
- Queue job production (adding jobs to queues)
- Event publishing
- No queue processing/workers
- No cron jobs

**Worker Service (`apps/worker`):**
- Queue job processing (workers/processors)
- Cron jobs and scheduled tasks
- Background task execution
- Event subscription and handling
- No HTTP controllers
- No direct API endpoints

**Shared Package (`packages/shared`):**
- TypeORM entities
- DTOs (Data Transfer Objects)
- Common services (EncryptionService, etc.)
- Event classes/interfaces
- Shared types and interfaces
- No business logic specific to one service

### Communication Flow

1. **Manual Sync Trigger:**
   - User → API Service (POST `/esp-connections/:id/sync`)
   - API Service → Publishes `SyncRequestedEvent`
   - Worker Service → Subscribes to event → Adds job to `subscriber-sync` queue
   - Worker Service → Processes job via `SubscriberSyncProcessor`

2. **Automatic Midnight Sync:**
   - Cron Job (midnight UTC) → `SyncSchedulerService`
   - `SyncSchedulerService` → Queries active ESP connections
   - `SyncSchedulerService` → Adds jobs to `subscriber-sync` queue for each connection
   - Worker Service → Processes jobs via `SubscriberSyncProcessor`

### Deployment Considerations
- Both services can be deployed as separate Docker containers
- Both services can scale independently (e.g., 3 API instances, 1 Worker instance)
- Services share same database and Redis connections
- Environment variables configure service behavior

## Technical Considerations

### NestJS Best Practices
- Use NestJS modules to organize code within each service
- Use dependency injection for all services
- Follow NestJS microservices patterns from official documentation
- Use `@nestjs/schedule` for cron jobs (recommended by NestJS)
- Use `@nestjs/event-emitter` or BullMQ events for inter-service communication

### Shared Package Structure
```
packages/shared/
  src/
    entities/          # TypeORM entities
    dto/              # Data Transfer Objects
    services/          # Common services (EncryptionService, etc.)
    events/            # Event classes/interfaces
    interfaces/       # Shared interfaces
    types/            # Shared TypeScript types
  package.json
  tsconfig.json
```

### Database Access
- Both services use TypeORM with same connection configuration
- Entities are defined in shared package
- Both services can read/write to same tables
- Consider transaction isolation for concurrent operations

### Queue Management
- API service: BullMQ producers only (can add jobs)
- Worker service: BullMQ workers only (can process jobs)
- Both connect to same Redis instance
- Queue configuration (retry, backoff) defined in worker service

### Cron Job Implementation
- Use `@nestjs/schedule` module (official NestJS solution)
- Use `@Cron()` decorator with cron pattern: `'0 0 * * *'` (midnight daily)
- Set timezone to UTC: `{ timeZone: 'UTC' }`
- Cron jobs run in worker service only
- Convert existing BullMQ repeatable jobs to `@Cron()` decorators

### Event Communication
- Option 1: Use `@nestjs/event-emitter` with Redis adapter for cross-service events
- Option 2: Use BullMQ's built-in event system
- Option 3: Use Redis pub/sub directly
- Recommended: BullMQ events or Redis pub/sub for simplicity

### Migration Strategy
1. Create shared package and move entities/DTOs
2. Create API service, migrate controllers
3. Create Worker service, migrate processors
4. Implement event communication
5. Add cron job scheduler
6. Test both services independently
7. Remove old backend application

### Error Handling
- Worker service should handle errors gracefully in cron jobs
- Failed sync jobs should be retried according to queue configuration
- Log all errors for monitoring
- Don't crash services on individual job failures

### Performance Considerations
- API service can scale horizontally (multiple instances)
- Worker service can scale horizontally (multiple instances process same queues)
- Database connection pooling configured per service
- Redis connection pooling for BullMQ

## Success Metrics

- Both services can start independently without errors
- API service handles all HTTP endpoints correctly
- Worker service processes all queue jobs correctly
- Midnight cron job runs at 00:00 UTC and queues all active ESP connections
- Manual sync triggers from API are processed by worker service
- No code duplication between services (all shared code in `packages/shared`)
- Build time for each service is independent
- Services can be deployed separately
- Zero downtime during migration (old backend can run alongside new services during transition)

## Open Questions

- Should we use BullMQ's built-in event system or implement custom Redis pub/sub for inter-service communication?
- Should the worker service expose a health check endpoint (even though it's not an API service)?
- How should we handle database migrations? Should API service run them, or both services, or a separate migration service?
- Should we add monitoring/observability (logging, metrics) as part of this PRD or separate?
- Should we implement graceful shutdown for both services?
- How should we handle shared configuration (env vars)? Should there be a shared config package?
