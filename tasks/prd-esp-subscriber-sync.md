# PRD: ESP Subscriber Sync System

## Introduction

Build a system to connect to Email Service Providers (ESPs) like Beehiiv, validate API credentials, and sync subscriber data into our database. The system will use a queue-based architecture with BullMQ and Redis to handle subscriber synchronization asynchronously. The design will be ESP-agnostic using a strategy pattern, with Beehiiv as the first implementation. Subscriber email addresses will be encrypted at rest, and masked versions will be stored for display purposes.

## Goals

- Allow users to connect ESP accounts by providing API keys
- Validate API keys on initial connection setup by testing against ESP API
- Store encrypted API keys securely in the database
- Sync all subscribers from connected ESP publications using background jobs
- Encrypt subscriber email addresses while storing masked versions for display
- Store comprehensive subscriber data (common fields + flexible JSONB for ESP-specific data)
- Implement automatic retry with exponential backoff for failed sync jobs
- Design an abstract ESP interface that can support multiple ESPs (starting with Beehiiv)

## User Stories

### US-001: Create ESP Connection Entity and Migration
**Description:** As a developer, I need database tables to store ESP connections and their encrypted credentials so the system can persist connection information.

**Acceptance Criteria:**
- [ ] Create `EspConnection` entity with fields: `id`, `userId`, `espType` (enum: 'beehiiv', etc.), `encryptedApiKey`, `publicationId`, `status` (enum: 'active', 'invalid', 'error'), `lastValidatedAt`, `createdAt`, `updatedAt`
- [ ] Create `Subscriber` entity with fields: `id`, `espConnectionId` (FK), `externalId` (ESP's subscriber ID), `encryptedEmail`, `maskedEmail`, `status` (enum: 'active', 'unsubscribed', 'bounced', etc.), `firstName`, `lastName`, `subscribedAt`, `unsubscribedAt`, `metadata` (JSONB for ESP-specific fields), `createdAt`, `updatedAt`
- [ ] Generate and run migration successfully
- [ ] Typecheck passes

### US-002: Create Encryption Service
**Description:** As a developer, I need a service to encrypt and decrypt sensitive data (API keys and email addresses) so they can be stored securely in the database.

**Acceptance Criteria:**
- [ ] Create `EncryptionService` with methods: `encrypt(plaintext: string): string` and `decrypt(ciphertext: string): string`
- [ ] Use AES-256 encryption with a key from environment variable `ENCRYPTION_KEY`
- [ ] Handle encryption/decryption errors gracefully
- [ ] Typecheck passes

### US-003: Create Email Masking Utility
**Description:** As a developer, I need a utility function to create masked email addresses (e.g., `m****@gmail.com`) for display purposes while keeping the original encrypted.

**Acceptance Criteria:**
- [ ] Create utility function `maskEmail(email: string): string` that masks the local part (before @) but keeps domain visible
- [ ] Handles edge cases: single character emails, very short emails, invalid formats
- [ ] Typecheck passes

### US-004: Create Abstract ESP Interface
**Description:** As a developer, I need an abstract interface that defines the contract for ESP integrations so we can support multiple ESPs with a consistent pattern.

**Acceptance Criteria:**
- [ ] Create `IEspConnector` interface with methods: `validateApiKey(apiKey: string, publicationId?: string): Promise<boolean>`, `fetchPublications(apiKey: string): Promise<Publication[]>`, `fetchSubscribers(apiKey: string, publicationId: string): Promise<SubscriberData[]>`
- [ ] Create `Publication` and `SubscriberData` DTOs/interfaces
- [ ] Typecheck passes

### US-005: Implement Beehiiv ESP Connector
**Description:** As a developer, I need a concrete implementation of the ESP connector for Beehiiv so we can connect to Beehiiv accounts.

**Acceptance Criteria:**
- [ ] Create `BeehiivConnector` class implementing `IEspConnector`
- [ ] `validateApiKey` calls `GET https://api.beehiiv.com/v2/publications` with Bearer token, returns true if status 200 and publication exists
- [ ] `fetchPublications` calls Beehiiv API and returns list of publications
- [ ] `fetchSubscribers` calls `GET https://api.beehiiv.com/v2/publications/:publicationId/subscriptions` with pagination, returns all subscribers
- [ ] Handles API errors (401, 403, 429, 500) appropriately
- [ ] Typecheck passes

### US-006: Create ESP Connection Service
**Description:** As a developer, I need a service to manage ESP connections, including validating API keys and storing encrypted credentials.

**Acceptance Criteria:**
- [ ] Create `EspConnectionService` with method `createConnection(userId: string, espType: string, apiKey: string, publicationId: string): Promise<EspConnection>`
- [ ] Method validates API key using appropriate ESP connector before saving
- [ ] Encrypts API key using `EncryptionService` before storing
- [ ] Sets `status` to 'active' if validation succeeds, throws error if validation fails
- [ ] Sets `lastValidatedAt` timestamp
- [ ] Typecheck passes

### US-007: Create ESP Connection Controller
**Description:** As a user, I want to connect my ESP account via API so I can start syncing subscribers.

**Acceptance Criteria:**
- [ ] Create `EspConnectionController` with `POST /api/esp-connections` endpoint
- [ ] Endpoint accepts `{ espType: string, apiKey: string, publicationId: string }`
- [ ] Validates request body (required fields, valid ESP type)
- [ ] Uses `EspConnectionService` to create connection
- [ ] Returns connection record (without encrypted API key) on success
- [ ] Returns appropriate error responses (400, 401, 500)
- [ ] Typecheck passes

### US-008: Install and Configure BullMQ
**Description:** As a developer, I need BullMQ and Redis configured so we can process background jobs for subscriber syncing.

**Acceptance Criteria:**
- [ ] Install `@nestjs/bullmq`, `bullmq`, and `ioredis` packages
- [ ] Add Redis connection configuration to `AppModule` using `BullModule.forRoot()`
- [ ] Configure Redis connection from environment variables (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`)
- [ ] Create `subscriber-sync` queue using `BullModule.registerQueue()`
- [ ] Typecheck passes

### US-009: Create Subscriber Sync Queue Processor
**Description:** As a developer, I need a queue processor that handles subscriber sync jobs so syncing happens asynchronously without blocking the API.

**Acceptance Criteria:**
- [ ] Create `SubscriberSyncProcessor` class with `@Processor('subscriber-sync')` decorator
- [ ] Create `@Process('sync-publication')` handler method that accepts job data: `{ espConnectionId: string }`
- [ ] Handler retrieves ESP connection from database, decrypts API key
- [ ] Handler uses appropriate ESP connector to fetch all subscribers
- [ ] Handler processes subscribers in batches and saves to database
- [ ] Handler updates ESP connection `lastSyncedAt` timestamp on success
- [ ] Typecheck passes

### US-010: Create Subscriber Sync Service
**Description:** As a developer, I need a service to orchestrate subscriber syncing, including encrypting emails and storing subscriber data.

**Acceptance Criteria:**
- [ ] Create `SubscriberSyncService` with method `syncSubscribers(espConnectionId: string): Promise<void>`
- [ ] Method fetches subscribers using ESP connector
- [ ] For each subscriber: encrypts email, creates masked email, maps ESP data to our schema
- [ ] Stores subscribers in database (upsert by `externalId` + `espConnectionId`)
- [ ] Stores ESP-specific fields in `metadata` JSONB column
- [ ] Handles errors and throws appropriate exceptions
- [ ] Typecheck passes

### US-011: Add Queue Job Producer for Manual Sync
**Description:** As a user, I want to trigger a manual subscriber sync via API so I can refresh my subscriber list on demand.

**Acceptance Criteria:**
- [ ] Add `POST /api/esp-connections/:id/sync` endpoint to `EspConnectionController`
- [ ] Endpoint validates ESP connection exists and belongs to requesting user
- [ ] Endpoint adds job to `subscriber-sync` queue with `{ espConnectionId: string }` data
- [ ] Returns job ID and status immediately (doesn't wait for sync to complete)
- [ ] Returns appropriate error responses (404 if connection not found, 403 if not owner)
- [ ] Typecheck passes

### US-012: Configure Queue Job Retry Policy
**Description:** As a developer, I need automatic retries with exponential backoff for failed sync jobs so transient errors don't cause permanent failures.

**Acceptance Criteria:**
- [ ] Configure queue job options with `attempts: 3` and `backoff: { type: 'exponential', delay: 2000 }`
- [ ] Failed jobs are automatically retried up to 3 times with increasing delays (2s, 4s, 8s)
- [ ] After 3 failed attempts, job is marked as failed and logged
- [ ] Typecheck passes

### US-013: Create Subscriber Repository and Service
**Description:** As a developer, I need a service to manage subscriber data in the database so we can query and update subscribers.

**Acceptance Criteria:**
- [ ] Create `SubscriberService` with methods: `findByEspConnection(espConnectionId: string): Promise<Subscriber[]>`, `upsertSubscriber(data: CreateSubscriberDto): Promise<Subscriber>`
- [ ] `upsertSubscriber` uses `externalId` + `espConnectionId` as unique key
- [ ] Updates existing subscriber if found, creates new if not
- [ ] Typecheck passes

### US-014: Map Beehiiv Subscriber Data to Our Schema
**Description:** As a developer, I need to map Beehiiv API subscriber response to our database schema so we store all available information.

**Acceptance Criteria:**
- [ ] Map Beehiiv subscriber fields: `email` → encrypted + masked, `status` → our status enum, `created_at` → `subscribedAt`, `first_name` → `firstName`, `last_name` → `lastName`
- [ ] Store all other Beehiiv fields (tags, custom fields, etc.) in `metadata` JSONB column
- [ ] Handle missing/null fields gracefully
- [ ] Typecheck passes

### US-015: Add ESP Connection Status Endpoint
**Description:** As a user, I want to check the status of my ESP connection and see when it was last synced.

**Acceptance Criteria:**
- [ ] Add `GET /api/esp-connections/:id` endpoint to `EspConnectionController`
- [ ] Returns connection details including: `id`, `espType`, `publicationId`, `status`, `lastValidatedAt`, `lastSyncedAt`, `createdAt`
- [ ] Does NOT return encrypted API key
- [ ] Validates user owns the connection (returns 403 if not)
- [ ] Returns 404 if connection not found
- [ ] Typecheck passes

## Functional Requirements

- FR-1: System must support connecting ESP accounts by accepting API key, ESP type, and publication ID
- FR-2: System must validate API keys by making a test API call to the ESP before saving credentials
- FR-3: System must encrypt API keys using AES-256 before storing in database
- FR-4: System must encrypt subscriber email addresses before storing in database
- FR-5: System must generate and store masked email addresses (e.g., `m****@gmail.com`) for display
- FR-6: System must use BullMQ queue with Redis for asynchronous subscriber syncing
- FR-7: System must implement full sync strategy (fetch all subscribers each time, replace local data)
- FR-8: System must store subscriber data with fixed schema (email, status, name, dates) plus JSONB metadata for ESP-specific fields
- FR-9: System must automatically retry failed sync jobs up to 3 times with exponential backoff (2s, 4s, 8s delays)
- FR-10: System must use abstract ESP connector interface that can be implemented for different ESPs
- FR-11: System must support Beehiiv as the first ESP implementation
- FR-12: System must handle pagination when fetching subscribers from ESP APIs
- FR-13: System must upsert subscribers (update if exists, create if new) based on external ID + ESP connection ID
- FR-14: System must validate API keys only on initial connection setup, not on every sync

## Non-Goals

- No incremental sync (only full sync for now)
- No webhook support for real-time updates
- No UI for managing connections (API-only for now)
- No support for multiple publications per ESP connection in initial version
- No subscriber export functionality (separate feature)
- No rate limiting or throttling of ESP API calls (assume ESP handles this)
- No support for other ESPs beyond Beehiiv in initial version (but architecture supports it)

## Design Considerations

### ESP Connector Pattern
- Use strategy pattern with `IEspConnector` interface
- Each ESP implements the interface with ESP-specific API calls
- Connector factory can instantiate the correct connector based on ESP type

### Data Model
- `EspConnection` stores one connection per user per publication
- `Subscriber` stores one record per subscriber per ESP connection
- Use JSONB for flexible metadata storage to accommodate different ESP field structures
- Index on `espConnectionId` and `externalId` for fast lookups

### Queue Architecture
- Single queue: `subscriber-sync`
- Job type: `sync-publication`
- Job data: `{ espConnectionId: string }`
- Processors handle the actual sync work

### Security
- Encryption key stored in environment variable, never in code
- API keys encrypted at rest using AES-256
- Email addresses encrypted at rest
- Masked emails for safe display in UI (future)

## Technical Considerations

### Dependencies
- `@nestjs/bullmq` - NestJS integration for BullMQ
- `bullmq` - Job queue library
- `ioredis` - Redis client
- `crypto` (Node.js built-in) - Encryption utilities

### Environment Variables
- `ENCRYPTION_KEY` - 32-byte key for AES-256 encryption (base64 encoded)
- `REDIS_HOST` - Redis server hostname (default: localhost)
- `REDIS_PORT` - Redis server port (default: 6379)
- `REDIS_PASSWORD` - Redis password (optional)

### Database Migrations
- Create migration for `esp_connections` table
- Create migration for `subscribers` table
- Add indexes for performance

### Error Handling
- API key validation failures return 401 Unauthorized
- Invalid ESP type returns 400 Bad Request
- Queue job failures are logged and retried automatically
- After max retries, job is marked as failed (can be manually retried later)

### Performance
- Process subscribers in batches (e.g., 100 at a time) to avoid memory issues
- Use database transactions for batch inserts/updates
- Consider adding database indexes on frequently queried fields

## Success Metrics

- Users can successfully connect Beehiiv accounts with valid API keys
- API key validation catches invalid keys before saving to database
- Subscriber sync jobs complete successfully for publications with < 10,000 subscribers
- Failed sync jobs automatically retry and succeed on transient errors
- Subscriber data is stored with all available fields from ESP API
- Email addresses are encrypted and cannot be read from database without decryption key
- System can be extended to support additional ESPs by implementing the connector interface

## Open Questions

- Should we store the last sync timestamp on the ESP connection for future incremental sync support?
- How should we handle ESP API rate limits? (Assume ESP handles this, but may need to add delays)
- Should we add a webhook endpoint for ESPs that support real-time updates? (Out of scope for now)
- How should we handle subscribers that are deleted from the ESP? (Full sync will naturally remove them)
- Should we add a scheduled job to automatically sync all active connections periodically? (Future enhancement)
- What is the maximum batch size for processing subscribers? (Start with 100, tune based on performance)
