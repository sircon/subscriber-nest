# API Service agents

NestJS HTTP API in `apps/api`: ESP integration, subscriber CRUD, storage, and export. Publishes events for worker service to process.

## Modules / areas

| Area | Responsibility |
|-----|----------------|
| **AppModule** | Root module: `ConfigModule`, `TypeOrmModule` (Postgres), `BullModule` (producers only), `EventEmitterModule`, all controllers and services. |
| **TypeORM / DB** | Postgres via TypeORM. Entities imported from `@subscriber-nest/shared/entities`. |
| **Controllers** | HTTP endpoints for authentication, subscribers, ESP connections, billing, dashboard, account management. |
| **Services** | Business logic services (SubscriberService, EspConnectionService, AuthService, BillingService, etc.). |
| **Event Emitter** | Publishes events (e.g., `SyncRequestedEvent`) for worker service to consume. |

## Important paths

- `src/main.ts` – bootstrap, CORS, port from `PORT` or 4000, raw body middleware for webhooks.  
- `src/app.module.ts` – TypeORM, BullMQ (producers only), EventEmitter, all controllers and services.  
- `src/controllers/` – HTTP controllers (auth, subscriber, esp-connection, billing, dashboard, account).  
- `src/services/` – Injectable services (SubscriberService, EspConnectionService, AuthService, etc.).  
- `src/guards/` – Route guards (AuthGuard, SubscriptionGuard).  
- `src/decorators/` – Custom decorators (CurrentUser).  
- DTOs are in `packages/shared/src/dto/` – Import using `@subscriber-nest/shared/dto` (e.g., `CreateSubscriberDto`, `CreateEspConnectionDto`).  
- Entities are in `packages/shared/src/entities/` – Import using `@subscriber-nest/shared/entities` (e.g., `Subscriber`, `EspConnection`).  
- Shared services are in `packages/shared/src/services/` – Import using `@subscriber-nest/shared/services` (e.g., `EncryptionService`).  

## Env (see `.env.example` or root README)

- `DATABASE_*` – Postgres connection (shared with worker).  
- `REDIS_*` – Redis connection for BullMQ (shared with worker).  
- `ENCRYPTION_KEY` – Encryption key for sensitive data (shared with worker).  
- `PORT` – HTTP port (default 4000).  
- `STRIPE_*` – Stripe API keys and webhook secret (API-specific).  
- `RESEND_*` – Resend email API keys (API-specific).  
- `NODE_ENV` – e.g. `development` / `production`; `synchronize` is off in production.  

## Event Publishing

- API service publishes events using `EventEmitter2` (injected via constructor).
- Use `eventEmitter.emit('EventClassName', eventInstance)` to publish events.
- Event classes are in `packages/shared/src/events/` – Import using `@subscriber-nest/shared/events`.
- Example: `eventEmitter.emit('SyncRequestedEvent', new SyncRequestedEvent(espConnectionId, userId))`.
- Events are published synchronously but processed asynchronously by worker service listeners.

## BullMQ (Producers Only)

- API service only acts as a producer – it adds jobs to queues but does not process them.
- Configure queues using `BullModule.registerQueue()` in AppModule.
- Inject queues using `@InjectQueue('queue-name')` decorator.
- Use `queue.add('job-name', jobData)` to add jobs to queues.
- Worker service processes all queue jobs.

## Email Service

- `src/services/email.service.ts` – EmailService using Resend API for sending emails
- `src/emails/` – react-email template components (`.tsx` files)
- Email templates use react-email components from `@react-email/components`
- Templates are rendered to HTML using `render()` from `@react-email/render` with `React.createElement()`
- TypeScript config includes `"jsx": "react"` to support JSX syntax in email templates
- React and react-dom are required dependencies for react-email to work

## Authentication

- `src/auth.controller.ts` – AuthController with authentication endpoints
- `src/services/auth.service.ts` – AuthService with business logic for auth flows
- `src/guards/auth.guard.ts` – AuthGuard for protecting routes with session validation
- `src/decorators/current-user.decorator.ts` – CurrentUser decorator to access authenticated user in controllers
- To inject TypeORM repositories into services, use `@InjectRepository(Entity)` decorator
- Import `TypeOrmModule.forFeature([Entity])` in the module to make repository available for injection
- Use `MoreThan()` from TypeORM to query records created after a specific date (useful for rate limiting)
- Use `BadRequestException` from `@nestjs/common` for client errors (rate limiting, validation failures)
- Use `UnauthorizedException` from `@nestjs/common` for authentication failures (invalid/expired/used codes)
- Session tokens are generated using `crypto.randomBytes(32).toString('hex')` for secure random tokens
- Sessions expire after 30 days (configurable in AuthService.verifyCode)
- When verifying codes, always mark the verification code as used after successful verification
- User creation happens automatically during code verification if user doesn't exist (with isOnboarded: false)
- **Guards**: Guards implement `CanActivate` interface and use `context.switchToHttp().getRequest()` to access request
- Guards that use dependency injection (e.g., `@InjectRepository()`) must be added to module providers
- Apply guards to routes using `@UseGuards(AuthGuard)` decorator on controllers or route handlers
- AuthGuard expects token in `Authorization: Bearer <token>` header format
- Guard attaches authenticated user to request object (`request.user`) for use with `@CurrentUser()` decorator

## ESP Connections

- `src/controllers/esp-connection.controller.ts` – EspConnectionController with ESP connection endpoints
- `src/services/esp-connection.service.ts` – EspConnectionService with business logic for ESP connections
- EspConnection entity is in `packages/shared/src/entities/` – Import using `@subscriber-nest/shared/entities`
- Provider validation checks against EspProvider enum values using `Object.values(EspProvider).includes()`
- API keys are encrypted before storing in database using EncryptionService from shared package
- API keys are never returned in API responses (only id, provider, createdAt, isActive)
- `triggerSync()` endpoint publishes `SyncRequestedEvent` instead of directly adding queue jobs

## Subscribers

- `src/controllers/subscriber.controller.ts` – SubscriberController with subscriber-specific endpoints (e.g., unmask email)
- When validating subscriber ownership: query with `relations: ['espConnection']` and compare `espConnection.userId` with authenticated user ID
- Pattern for sensitive operations on subscribers: fetch with relations → validate ownership → perform operation → handle errors

## File Export

- `src/services/subscriber-export.service.ts` – SubscriberExportService for exporting subscribers in CSV, JSON, and Excel formats
- Use `StreamableFile` from `@nestjs/common` for file downloads
- Use `@Res({ passthrough: true })` decorator to set response headers while returning StreamableFile
- Set headers with `response.set({ 'Content-Type': '...', 'Content-Disposition': 'attachment; filename="..."' })`
- Excel exports use `exceljs` library (Workbook → Worksheet → writeBuffer)
- CSV exports use manual implementation with proper escaping (quotes, commas, newlines)
- Always decrypt sensitive data (emails) before exporting
- Flatten nested metadata fields for export (e.g., `metadata.field` → `metadata_field`)

## Encryption

- EncryptionService is in `packages/shared/src/services/` – Import using `@subscriber-nest/shared/services`
- EncryptionService uses Node's built-in crypto module with AES-256-GCM
- Use Node's built-in `crypto` module for encryption (no external dependencies needed)
- AES-256-GCM provides authenticated encryption (encryption + integrity verification)
- Encryption format: `iv:authTag:encryptedData` (colon-separated hex strings)
- EncryptionService uses ConfigService to read ENCRYPTION_KEY from environment and throws error if missing (fail-fast)
- Convert encryption key to 32-byte buffer using SHA-256 hash for AES-256 key requirement
- Always encrypt sensitive data (like API keys) before storing in database

## Scripts

- `dev` – `nest start --watch`  
- `build` – `nest build`  
- `start` – `node dist/main.js`  
- `migration:generate`, `migration:run`, `migration:revert` – TypeORM CLI via `data-source.ts`. Run `nest build` before `migration:run`.

## Patterns

- **Services with TypeORM**: Use `@InjectRepository(Entity)` to inject repositories. Register entities with `TypeOrmModule.forFeature([Entity])` in the module. Entities are imported from `@subscriber-nest/shared/entities`.
- **Upsert pattern**: Use `findOne()` to check existence, then `save()` to create or update. The unique constraint on `externalId + espConnectionId` ensures data integrity.
- **BullMQ queues (producers)**: Configure queues using `BullModule.registerQueue()` with `defaultJobOptions` for retry policies. Use `attempts: 3` and `backoff: { type: 'exponential', delay: 2000 }` for automatic retries with exponential backoff (2s, 4s, 8s delays). API service only adds jobs, never processes them.
- **Event publishing**: Use `EventEmitter2` to publish events for worker service. Import event classes from `@subscriber-nest/shared/events`. Events are published synchronously but processed asynchronously.
- **Shared package imports**: Always use `@subscriber-nest/shared/*` path aliases for entities, DTOs, services, and events. Do not use relative imports to shared package from API service.
