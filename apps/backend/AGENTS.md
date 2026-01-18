# Backend agents

NestJS app in `apps/backend`: ESP integration, subscriber sync, storage, and export.

## Modules / areas

| Area | Responsibility |
|-----|----------------|
| **AppModule** | Root module: `ConfigModule`, `TypeOrmModule` (Postgres), `AppController` / `AppService`. |
| **TypeORM / DB** | Postgres via TypeORM. `src/data-source.ts` is used by the TypeORM CLI for migrations. |
| **ESP connector** (to add) | Connect to ESP APIs, auth, fetch subscriber lists. |
| **Sync** (to add) | Compare ESP vs local DB, apply creates/updates/deletes, handle conflicts. |
| **Subscribers** | CRUD for subscriber entities via `SubscriberService`. Services use `@InjectRepository()` to inject TypeORM repositories. |
| **Export** (to add) | Export subscriber list (e.g. CSV/JSON), optionally streamed or async. |
| **Billing** | Usage-based subscription billing with Stripe integration. See [BILLING.md](./BILLING.md) for detailed documentation. |

## Important paths

- `src/main.ts` – bootstrap, CORS, port from `PORT` or 4000.  
- `src/app.module.ts` – TypeORM and env-based DB config.  
- `src/data-source.ts` – DataSource for `migration:generate`, `migration:run`, `migration:revert`.  
- `src/migrations/` – migration files (built to `dist/migrations/` for `migration:run`).  
- `src/services/` – Injectable services (e.g., `SubscriberService`, `EncryptionService`).  
- `src/dto/` – Data Transfer Objects for API requests/responses (e.g., `CreateSubscriberDto`).  
- `src/entities/` – TypeORM entities (e.g., `Subscriber`, `EspConnection`).  
- `src/processors/` – BullMQ queue processors (e.g., `SubscriberSyncProcessor`).  

## Env (see `.env.example` or root README)

- `DATABASE_*` – Postgres connection.  
- `PORT` – HTTP port (default 4000).  
- `NODE_ENV` – e.g. `development` / `production`; `synchronize` is off in production.  

## Email Service

- `src/email.service.ts` – EmailService using Resend API for sending emails
- `src/emails/` – react-email template components (`.tsx` files)
- Email templates use react-email components from `@react-email/components`
- Templates are rendered to HTML using `render()` from `@react-email/render` with `React.createElement()`
- TypeScript config includes `"jsx": "react"` to support JSX syntax in email templates
- React and react-dom are required dependencies for react-email to work in backend

## Authentication

- `src/auth.controller.ts` – AuthController with authentication endpoints
- `src/auth.service.ts` – AuthService with business logic for auth flows
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

- `src/esp-connection.controller.ts` – EspConnectionController with ESP connection endpoints
- `src/esp-connection.service.ts` – EspConnectionService with business logic for ESP connections
- `src/entities/esp-connection.entity.ts` – EspConnection entity with provider enum and encrypted API key
- Provider validation checks against EspProvider enum values using `Object.values(EspProvider).includes()`
- API keys are encrypted before storing in database using EncryptionService
- API keys are never returned in API responses (only id, provider, createdAt, isActive)

## OAuth Integration

- `src/services/oauth-state.service.ts` – OAuthStateService for managing OAuth state tokens (CSRF protection)
- `src/services/oauth-config.service.ts` – OAuthConfigService for reading OAuth configuration from environment variables
- `src/services/oauth-token-refresh.service.ts` – OAuthTokenRefreshService for refreshing expired OAuth access tokens using refresh tokens
- `src/entities/oauth-state.entity.ts` – OAuthState entity for storing OAuth state parameters
- OAuth initiate endpoints (`GET /esp-connections/oauth/initiate/:provider`) require authentication via `@UseGuards(AuthGuard)`
- OAuth callback endpoints (`GET /esp-connections/oauth/callback/:provider`) should NOT require authentication (called by external OAuth providers)
- Use `@Query()` decorator to get query parameters (`code`, `state`) from OAuth callback URLs
- OAuth state tokens expire after 10 minutes and should be deleted after successful use to prevent replay attacks
- Token exchange uses HttpService from `@nestjs/axios` with `firstValueFrom()` from rxjs to convert Observable to Promise
- Token exchange requests use `application/x-www-form-urlencoded` content type with URLSearchParams
- OAuth token responses may not always include `refresh_token` or `expires_in` - handle with defaults (e.g., 3600 seconds for expires_in)
- Calculate token expiry by adding `expires_in` seconds to current time: `new Date(Date.now() + expiresIn * 1000)`
- Always encrypt OAuth tokens (access_token, refresh_token) using EncryptionService before storing in database
- Redirect to frontend with connection ID and success parameter: `{FRONTEND_URL}/esp-connections/{connectionId}?oauth=success`
- Token refresh uses `grant_type=refresh_token` with refresh_token, client_id, and client_secret in the request body
- Token refresh may return a new refresh_token - if provided, update it; otherwise keep the existing refresh token
- Handle token refresh errors: 400 (invalid refresh token), 401 (expired/revoked refresh token) - throw BadRequestException with user-friendly messages
- After successful token refresh, update `encryptedAccessToken`, `encryptedRefreshToken` (if new one provided), `tokenExpiresAt`, and `lastValidatedAt` in the database

## Subscribers

- `src/subscriber.controller.ts` – SubscriberController with subscriber-specific endpoints (e.g., unmask email)
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

- `src/encryption.service.ts` – EncryptionService using Node's built-in crypto module with AES-256-GCM
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

- **Services with TypeORM**: Use `@InjectRepository(Entity)` to inject repositories. Register entities with `TypeOrmModule.forFeature([Entity])` in the module.
- **Upsert pattern**: Use `findOne()` to check existence, then `save()` to create or update. The unique constraint on `externalId + espConnectionId` ensures data integrity.
- **BullMQ queues**: Configure queues using `BullModule.registerQueue()` with `defaultJobOptions` for retry policies. Use `attempts: 3` and `backoff: { type: 'exponential', delay: 2000 }` for automatic retries with exponential backoff (2s, 4s, 8s delays).
- **BullMQ processors**: Processors extend `WorkerHost` from `@nestjs/bullmq` and use `@Processor('queue-name')` decorator. In `@nestjs/bullmq` v11, implement `process(job: Job<JobData>)` method and check `job.name` to handle specific job types (the `@Process` decorator is not available). Processors must be registered in the module's `providers` array. Re-throw errors so BullMQ can handle retries according to the queue's retry policy.
- **BullMQ retry handling**: Use `job.attemptsMade` and `job.opts.attempts` to detect final retry attempt. Pattern: `const isFinalAttempt = job.attemptsMade >= (job.opts.attempts || 1)`. Only record permanent failure status after all retries exhausted to avoid logging intermediate retry failures.  
