# PRD: ESP Connectors for 14 Additional Email Service Providers

## Introduction

Add connectors for 14 additional Email Service Providers (ESPs) to expand AudienceSafe's integration capabilities. Each connector will implement the `IEspConnector` interface to enable subscriber synchronization, publication fetching, and API key/OAuth validation. Connectors will prefer API key authentication when supported by the ESP, with OAuth as a fallback option.

## Goals

- Add 14 new ESP types to the system (Campaign Monitor, Email Octopus, Omeda, Ghost, SparkPost, ActiveCampaign, Customer.io, Sailthru, MailerLite, PostUp, Constant Contact, Iterable, SendGrid, Brevo)
- Implement connector classes for each ESP following the existing pattern
- Support API key authentication (preferred) or OAuth where applicable
- Enable subscriber synchronization for all new ESPs
- Ensure consistent error handling and validation across all connectors
- Add integration tests with mock ESP APIs

## User Stories

### US-001: Add ESP types to database enum
**Description:** As a developer, I need to add all 14 new ESP types to the `EspType` enum so they can be stored in the database and referenced throughout the system.

**Acceptance Criteria:**
- [ ] Add all 14 ESP types to `EspType` enum in `esp-connection.entity.ts`:
  - `CAMPAIGN_MONITOR = 'campaign_monitor'`
  - `EMAIL_OCTOPUS = 'email_octopus'`
  - `OMEDA = 'omeda'`
  - `GHOST = 'ghost'`
  - `SPARKPOST = 'sparkpost'`
  - `ACTIVE_CAMPAIGN = 'active_campaign'`
  - `CUSTOMER_IO = 'customer_io'`
  - `SAILTHRU = 'sailthru'`
  - `MAILERLITE = 'mailerlite'`
  - `POSTUP = 'postup'`
  - `CONSTANT_CONTACT = 'constant_contact'`
  - `ITERABLE = 'iterable'`
  - `SENDGRID = 'sendgrid'`
  - `BREVO = 'brevo'`
- [ ] Generate and run database migration to update enum type
- [ ] Typecheck passes
- [ ] All enum values use kebab-case format matching existing pattern

### US-002: Create Campaign Monitor connector
**Description:** As a developer, I need a Campaign Monitor connector that implements `IEspConnector` to enable subscriber synchronization from Campaign Monitor.

**Acceptance Criteria:**
- [ ] Create `campaign-monitor.connector.ts` in `apps/backend/libs/core/src/esp/`
- [ ] Implement all required methods from `IEspConnector` interface
- [ ] Support API key authentication (preferred) or OAuth if required
- [ ] Implement `validateApiKey()` method
- [ ] Implement `fetchPublications()` method
- [ ] Implement `fetchSubscribers()` method
- [ ] Implement `getSubscriberCount()` method
- [ ] Handle errors consistently with existing connectors
- [ ] Typecheck passes
- [ ] Integration test passes with mock Campaign Monitor API

### US-003: Create Email Octopus connector
**Description:** As a developer, I need an Email Octopus connector that implements `IEspConnector` to enable subscriber synchronization from Email Octopus.

**Acceptance Criteria:**
- [ ] Create `email-octopus.connector.ts` in `apps/backend/libs/core/src/esp/`
- [ ] Implement all required methods from `IEspConnector` interface
- [ ] Support API key authentication (preferred) or OAuth if required
- [ ] Implement `validateApiKey()` method
- [ ] Implement `fetchPublications()` method
- [ ] Implement `fetchSubscribers()` method
- [ ] Implement `getSubscriberCount()` method
- [ ] Handle errors consistently with existing connectors
- [ ] Typecheck passes
- [ ] Integration test passes with mock Email Octopus API

### US-004: Create Omeda connector
**Description:** As a developer, I need an Omeda connector that implements `IEspConnector` to enable subscriber synchronization from Omeda.

**Acceptance Criteria:**
- [ ] Create `omeda.connector.ts` in `apps/backend/libs/core/src/esp/`
- [ ] Implement all required methods from `IEspConnector` interface
- [ ] Support API key authentication (preferred) or OAuth if required
- [ ] Implement `validateApiKey()` method
- [ ] Implement `fetchPublications()` method
- [ ] Implement `fetchSubscribers()` method
- [ ] Implement `getSubscriberCount()` method
- [ ] Handle errors consistently with existing connectors
- [ ] Typecheck passes
- [ ] Integration test passes with mock Omeda API

### US-005: Create Ghost connector
**Description:** As a developer, I need a Ghost connector that implements `IEspConnector` to enable subscriber synchronization from Ghost.

**Acceptance Criteria:**
- [ ] Create `ghost.connector.ts` in `apps/backend/libs/core/src/esp/`
- [ ] Implement all required methods from `IEspConnector` interface
- [ ] Support API key authentication (preferred) or OAuth if required
- [ ] Implement `validateApiKey()` method
- [ ] Implement `fetchPublications()` method
- [ ] Implement `fetchSubscribers()` method
- [ ] Implement `getSubscriberCount()` method
- [ ] Handle errors consistently with existing connectors
- [ ] Typecheck passes
- [ ] Integration test passes with mock Ghost API

### US-006: Create SparkPost connector
**Description:** As a developer, I need a SparkPost connector that implements `IEspConnector` to enable subscriber synchronization from SparkPost.

**Acceptance Criteria:**
- [ ] Create `sparkpost.connector.ts` in `apps/backend/libs/core/src/esp/`
- [ ] Implement all required methods from `IEspConnector` interface
- [ ] Support API key authentication (preferred) or OAuth if required
- [ ] Implement `validateApiKey()` method
- [ ] Implement `fetchPublications()` method
- [ ] Implement `fetchSubscribers()` method
- [ ] Implement `getSubscriberCount()` method
- [ ] Handle errors consistently with existing connectors
- [ ] Typecheck passes
- [ ] Integration test passes with mock SparkPost API

### US-007: Create ActiveCampaign connector
**Description:** As a developer, I need an ActiveCampaign connector that implements `IEspConnector` to enable subscriber synchronization from ActiveCampaign.

**Acceptance Criteria:**
- [ ] Create `active-campaign.connector.ts` in `apps/backend/libs/core/src/esp/`
- [ ] Implement all required methods from `IEspConnector` interface
- [ ] Support API key authentication (preferred) or OAuth if required
- [ ] Implement `validateApiKey()` method
- [ ] Implement `fetchPublications()` method
- [ ] Implement `fetchSubscribers()` method
- [ ] Implement `getSubscriberCount()` method
- [ ] Handle errors consistently with existing connectors
- [ ] Typecheck passes
- [ ] Integration test passes with mock ActiveCampaign API

### US-008: Create Customer.io connector
**Description:** As a developer, I need a Customer.io connector that implements `IEspConnector` to enable subscriber synchronization from Customer.io.

**Acceptance Criteria:**
- [ ] Create `customer-io.connector.ts` in `apps/backend/libs/core/src/esp/`
- [ ] Implement all required methods from `IEspConnector` interface
- [ ] Support API key authentication (preferred) or OAuth if required
- [ ] Implement `validateApiKey()` method
- [ ] Implement `fetchPublications()` method
- [ ] Implement `fetchSubscribers()` method
- [ ] Implement `getSubscriberCount()` method
- [ ] Handle errors consistently with existing connectors
- [ ] Typecheck passes
- [ ] Integration test passes with mock Customer.io API

### US-009: Create Sailthru connector
**Description:** As a developer, I need a Sailthru connector that implements `IEspConnector` to enable subscriber synchronization from Sailthru.

**Acceptance Criteria:**
- [ ] Create `sailthru.connector.ts` in `apps/backend/libs/core/src/esp/`
- [ ] Implement all required methods from `IEspConnector` interface
- [ ] Support API key authentication (preferred) or OAuth if required
- [ ] Implement `validateApiKey()` method
- [ ] Implement `fetchPublications()` method
- [ ] Implement `fetchSubscribers()` method
- [ ] Implement `getSubscriberCount()` method
- [ ] Handle errors consistently with existing connectors
- [ ] Typecheck passes
- [ ] Integration test passes with mock Sailthru API

### US-010: Create MailerLite connector
**Description:** As a developer, I need a MailerLite connector that implements `IEspConnector` to enable subscriber synchronization from MailerLite.

**Acceptance Criteria:**
- [ ] Create `mailerlite.connector.ts` in `apps/backend/libs/core/src/esp/`
- [ ] Implement all required methods from `IEspConnector` interface
- [ ] Support API key authentication (preferred) or OAuth if required
- [ ] Implement `validateApiKey()` method
- [ ] Implement `fetchPublications()` method
- [ ] Implement `fetchSubscribers()` method
- [ ] Implement `getSubscriberCount()` method
- [ ] Handle errors consistently with existing connectors
- [ ] Typecheck passes
- [ ] Integration test passes with mock MailerLite API

### US-011: Create PostUp connector
**Description:** As a developer, I need a PostUp connector that implements `IEspConnector` to enable subscriber synchronization from PostUp.

**Acceptance Criteria:**
- [ ] Create `postup.connector.ts` in `apps/backend/libs/core/src/esp/`
- [ ] Implement all required methods from `IEspConnector` interface
- [ ] Support API key authentication (preferred) or OAuth if required
- [ ] Implement `validateApiKey()` method
- [ ] Implement `fetchPublications()` method
- [ ] Implement `fetchSubscribers()` method
- [ ] Implement `getSubscriberCount()` method
- [ ] Handle errors consistently with existing connectors
- [ ] Typecheck passes
- [ ] Integration test passes with mock PostUp API

### US-012: Create Constant Contact connector
**Description:** As a developer, I need a Constant Contact connector that implements `IEspConnector` to enable subscriber synchronization from Constant Contact.

**Acceptance Criteria:**
- [ ] Create `constant-contact.connector.ts` in `apps/backend/libs/core/src/esp/`
- [ ] Implement all required methods from `IEspConnector` interface
- [ ] Support API key authentication (preferred) or OAuth if required
- [ ] Implement `validateApiKey()` method
- [ ] Implement `fetchPublications()` method
- [ ] Implement `fetchSubscribers()` method
- [ ] Implement `getSubscriberCount()` method
- [ ] Handle errors consistently with existing connectors
- [ ] Typecheck passes
- [ ] Integration test passes with mock Constant Contact API

### US-013: Create Iterable connector
**Description:** As a developer, I need an Iterable connector that implements `IEspConnector` to enable subscriber synchronization from Iterable.

**Acceptance Criteria:**
- [ ] Create `iterable.connector.ts` in `apps/backend/libs/core/src/esp/`
- [ ] Implement all required methods from `IEspConnector` interface
- [ ] Support API key authentication (preferred) or OAuth if required
- [ ] Implement `validateApiKey()` method
- [ ] Implement `fetchPublications()` method
- [ ] Implement `fetchSubscribers()` method
- [ ] Implement `getSubscriberCount()` method
- [ ] Handle errors consistently with existing connectors
- [ ] Typecheck passes
- [ ] Integration test passes with mock Iterable API

### US-014: Create SendGrid connector
**Description:** As a developer, I need a SendGrid connector that implements `IEspConnector` to enable subscriber synchronization from SendGrid.

**Acceptance Criteria:**
- [ ] Create `sendgrid.connector.ts` in `apps/backend/libs/core/src/esp/`
- [ ] Implement all required methods from `IEspConnector` interface
- [ ] Support API key authentication (preferred) or OAuth if required
- [ ] Implement `validateApiKey()` method
- [ ] Implement `fetchPublications()` method
- [ ] Implement `fetchSubscribers()` method
- [ ] Implement `getSubscriberCount()` method
- [ ] Handle errors consistently with existing connectors
- [ ] Typecheck passes
- [ ] Integration test passes with mock SendGrid API

### US-015: Create Brevo connector
**Description:** As a developer, I need a Brevo connector that implements `IEspConnector` to enable subscriber synchronization from Brevo.

**Acceptance Criteria:**
- [ ] Create `brevo.connector.ts` in `apps/backend/libs/core/src/esp/`
- [ ] Implement all required methods from `IEspConnector` interface
- [ ] Support API key authentication (preferred) or OAuth if required
- [ ] Implement `validateApiKey()` method
- [ ] Implement `fetchPublications()` method
- [ ] Implement `fetchSubscribers()` method
- [ ] Implement `getSubscriberCount()` method
- [ ] Handle errors consistently with existing connectors
- [ ] Typecheck passes
- [ ] Integration test passes with mock Brevo API

### US-016: Register all connectors in ESP module
**Description:** As a developer, I need all 14 new connectors registered in the ESP module so they can be injected and used by services.

**Acceptance Criteria:**
- [ ] Import all 14 connector classes in `esp.module.ts`
- [ ] Add all 14 connectors to `providers` array
- [ ] Add all 14 connectors to `exports` array
- [ ] Ensure proper dependency injection setup
- [ ] Typecheck passes
- [ ] Module compiles without errors

### US-017: Update EspConnectionService to support new connectors
**Description:** As a developer, I need the `EspConnectionService` to recognize and use all 14 new connectors when creating connections and syncing subscribers.

**Acceptance Criteria:**
- [ ] Inject all 14 new connectors in `EspConnectionService` constructor
- [ ] Add all 14 ESP types to `getConnector()` switch statement
- [ ] Ensure each case returns the correct connector instance
- [ ] Update error message to reflect all supported ESP types
- [ ] Typecheck passes
- [ ] All connectors are accessible through the service

### US-018: Update SubscriberSyncService to support new connectors
**Description:** As a developer, I need the `SubscriberSyncService` to recognize and use all 14 new connectors when syncing subscribers.

**Acceptance Criteria:**
- [ ] Inject all 14 new connectors in `SubscriberSyncService` constructor
- [ ] Add all 14 ESP types to `getConnector()` switch statement
- [ ] Ensure each case returns the correct connector instance
- [ ] Update error message to reflect all supported ESP types
- [ ] Typecheck passes
- [ ] All connectors work with sync functionality

### US-019: Create integration tests for all connectors
**Description:** As a developer, I need integration tests with mock ESP APIs to verify each connector works correctly with the expected API responses.

**Acceptance Criteria:**
- [ ] Create test file `esp-connectors.integration.spec.ts` in appropriate test directory
- [ ] Create mock API responses for each of the 14 ESPs
- [ ] Test `validateApiKey()` for each connector with valid and invalid keys
- [ ] Test `fetchPublications()` for each connector
- [ ] Test `fetchSubscribers()` for each connector
- [ ] Test `getSubscriberCount()` for each connector
- [ ] Test error handling for each connector (401, 403, 429, 500 errors)
- [ ] All integration tests pass
- [ ] Tests use mock HTTP responses (not real API calls)

## Functional Requirements

- FR-1: All 14 ESP types must be added to the `EspType` enum in the database entity
- FR-2: Each connector must implement the `IEspConnector` interface completely
- FR-3: Each connector must support API key authentication when the ESP supports it
- FR-4: Each connector must support OAuth authentication when API keys are not available or preferred
- FR-5: Each connector must validate API keys by making a test request to the ESP API
- FR-6: Each connector must fetch publications (lists/audiences) available for the authenticated account
- FR-7: Each connector must fetch all subscribers for a given publication
- FR-8: Each connector must provide subscriber count without fetching all subscriber data
- FR-9: Each connector must handle HTTP errors consistently (401, 403, 429, 500, network errors)
- FR-10: All connectors must be registered in the ESP module for dependency injection
- FR-11: `EspConnectionService` must support all 14 new ESP types in its `getConnector()` method
- FR-12: `SubscriberSyncService` must support all 14 new ESP types in its `getConnector()` method
- FR-13: Integration tests must verify all connector methods work with mock API responses
- FR-14: All connectors must follow the same error handling pattern as existing connectors (Beehiiv, Kit, Mailchimp)

## Non-Goals

- No frontend UI changes for ESP selection (assumes frontend will be updated separately)
- No OAuth flow implementation for ESPs that require it (only connector methods for OAuth token validation)
- No rate limiting implementation beyond standard error handling
- No pagination optimization beyond what's needed for basic functionality
- No custom field mapping beyond standard subscriber fields (email, firstName, lastName, status)
- No real-time webhook support for subscriber updates
- No batch operations or bulk import/export features

## Technical Considerations

- **API Documentation:** Each connector will need to reference the ESP's official API documentation to understand:
  - Authentication method (API key vs OAuth)
  - Base URL and API version
  - Endpoint structure for publications/lists
  - Endpoint structure for subscribers
  - Rate limits and error response formats
  - Pagination mechanisms

- **Error Handling:** Follow the pattern from existing connectors:
  - Return `false` for `validateApiKey()` on 401/403 errors
  - Log errors but don't throw for validation failures
  - Throw appropriate exceptions for unexpected errors
  - Handle network errors gracefully

- **Data Mapping:** Map ESP-specific subscriber statuses to our internal `SubscriberStatus` enum where applicable. Some ESPs may use different status terminology (e.g., "active", "subscribed", "unsubscribed", "bounced").

- **Pagination:** Many ESP APIs use pagination. Implement pagination handling to fetch all subscribers, not just the first page. Common patterns:
  - Offset/limit pagination
  - Cursor-based pagination
  - Page number pagination

- **Rate Limiting:** While not implementing custom rate limiting, connectors should handle 429 (Too Many Requests) errors appropriately and log them.

- **Testing:** Use `@nestjs/axios` HttpService with mocked responses. Consider using libraries like `nock` or `axios-mock-adapter` for HTTP mocking in integration tests.

## Success Metrics

- All 14 connectors are implemented and pass type checking
- All 14 connectors pass integration tests with mock APIs
- Database migration runs successfully with new enum values
- All connectors are registered and accessible through dependency injection
- Services can create connections and sync subscribers for all 14 ESPs
- Error handling is consistent across all connectors
- Code follows the same patterns as existing connectors (Beehiiv, Kit, Mailchimp)

## Open Questions

- What are the exact API endpoints and authentication methods for each ESP? (To be researched during implementation)
- Which ESPs support OAuth vs API key only? (To be determined per ESP documentation)
- Do any ESPs require special headers or request formats beyond standard REST APIs?
- Are there any ESPs that don't have a "publication" or "list" concept? How should we handle those?
- Should we create a shared utility for common pagination patterns?
- Should we create a shared utility for common error handling patterns?
