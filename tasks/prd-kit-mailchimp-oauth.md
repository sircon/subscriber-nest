# PRD: Kit and Mailchimp OAuth Integration

## Introduction

Integrate Kit and Mailchimp ESPs using OAuth 2.0 authorization code flow, allowing users to connect their accounts without manually entering API keys. The system will support both OAuth-based connections (Kit, Mailchimp) and API key-based connections (Beehiiv) simultaneously. OAuth tokens (access and refresh) will be stored encrypted, with automatic token refresh using both proactive (before expiry) and reactive (on 401) strategies. When users connect via OAuth, the system will automatically detect and connect all available publications from their account.

## Goals

- Enable OAuth 2.0 authorization code flow for Kit and Mailchimp ESPs
- Store encrypted OAuth access and refresh tokens securely
- Automatically refresh expired tokens using proactive and reactive strategies
- Auto-detect and connect all publications from OAuth-connected accounts
- Maintain backward compatibility with API key authentication (Beehiiv)
- Auto-trigger sync for all connected publications after successful OAuth connection
- Implement Kit integration first, then Mailchimp
- Support multiple publications per OAuth connection (stored as JSON array)

## User Stories

### US-001: Create OAuth State Entity and Migration
**Description:** As a developer, I need a database table to store OAuth state parameters so we can validate OAuth callbacks and prevent CSRF attacks.

**Acceptance Criteria:**
- [ ] Create `OAuthState` entity with fields: `id` (UUID), `userId` (FK to User), `espType` (enum: 'kit', 'mailchimp'), `state` (string, unique), `redirectUri` (string, nullable), `expiresAt` (timestamp), `createdAt` (timestamp)
- [ ] Add index on `state` field for fast lookups
- [ ] Add index on `userId` and `espType` for cleanup queries
- [ ] Generate and run migration successfully
- [ ] Typecheck passes

### US-002: Update EspConnection Entity to Support OAuth
**Description:** As a developer, I need to update the EspConnection entity to support both API key and OAuth token storage so we can handle different authentication methods.

**Acceptance Criteria:**
- [ ] Add `authMethod` field (enum: 'api_key', 'oauth') to `EspConnection` entity
- [ ] Make `encryptedApiKey` nullable (required only for API key auth)
- [ ] Add `encryptedAccessToken` (text, nullable) field for OAuth access token
- [ ] Add `encryptedRefreshToken` (text, nullable) field for OAuth refresh token
- [ ] Add `tokenExpiresAt` (timestamp, nullable) field to track access token expiry
- [ ] Add `publicationIds` (JSONB, nullable) field to store array of publication IDs for OAuth connections
- [ ] Update existing `publicationId` field to be nullable (OAuth connections use `publicationIds` array)
- [ ] Generate and run migration successfully
- [ ] Typecheck passes

### US-003: Create OAuth State Service
**Description:** As a developer, I need a service to manage OAuth state tokens for secure OAuth flow validation.

**Acceptance Criteria:**
- [ ] Create `OAuthStateService` with method `createState(userId: string, espType: EspType, redirectUri?: string): Promise<string>` that generates random state string and stores in database
- [ ] State expires after 10 minutes
- [ ] Method `validateState(state: string, espType: EspType): Promise<{ userId: string; redirectUri?: string }>` validates state and returns user info
- [ ] Method `deleteState(state: string): Promise<void>` removes state after use
- [ ] Add scheduled job (runs hourly) to clean up expired OAuth states
- [ ] Typecheck passes

### US-004: Create OAuth Configuration Service
**Description:** As a developer, I need a service to manage OAuth configuration (client ID, client secret, endpoints) for Kit and Mailchimp.

**Acceptance Criteria:**
- [ ] Create `OAuthConfigService` that reads OAuth config from environment variables
- [ ] Kit config: `KIT_OAUTH_CLIENT_ID`, `KIT_OAUTH_CLIENT_SECRET`, `KIT_OAUTH_AUTHORIZATION_URL`, `KIT_OAUTH_TOKEN_URL`, `KIT_OAUTH_SCOPES`
- [ ] Mailchimp config: `MAILCHIMP_OAUTH_CLIENT_ID`, `MAILCHIMP_OAUTH_CLIENT_SECRET`, `MAILCHIMP_OAUTH_AUTHORIZATION_URL`, `MAILCHIMP_OAUTH_TOKEN_URL`, `MAILCHIMP_OAUTH_SCOPES`
- [ ] Method `getConfig(espType: EspType): OAuthConfig` returns configuration for specified ESP
- [ ] Validates all required config values are present on initialization
- [ ] Typecheck passes

### US-005: Create OAuth Initiate Endpoint
**Description:** As a user, I want to initiate OAuth connection for Kit or Mailchimp so I can connect my account without entering API keys.

**Acceptance Criteria:**
- [ ] Add `GET /esp-connections/oauth/initiate/:provider` endpoint to `EspConnectionController`
- [ ] Endpoint accepts `provider` param: 'kit' or 'mailchimp'
- [ ] Endpoint requires authentication (use `@UseGuards(AuthGuard)`)
- [ ] Endpoint creates OAuth state using `OAuthStateService`
- [ ] Endpoint builds OAuth authorization URL with: client_id, redirect_uri, response_type=code, scope, state
- [ ] Redirect URI: `{BACKEND_URL}/api/esp-connections/oauth/callback/{provider}`
- [ ] Endpoint redirects user to ESP's OAuth authorization page
- [ ] Handle errors appropriately (invalid provider, missing config)
- [ ] Typecheck passes

### US-006: Create OAuth Callback Endpoint
**Description:** As a user, I want the OAuth callback to complete the connection process after I authorize the app on the ESP's website.

**Acceptance Criteria:**
- [ ] Add `GET /esp-connections/oauth/callback/:provider` endpoint to `EspConnectionController`
- [ ] Endpoint accepts query params: `code` (authorization code), `state` (OAuth state)
- [ ] Endpoint validates state using `OAuthStateService.validateState()`
- [ ] Endpoint exchanges authorization code for access token by calling ESP's token endpoint
- [ ] Token exchange includes: grant_type=authorization_code, code, redirect_uri, client_id, client_secret
- [ ] Endpoint stores encrypted access token, refresh token, and expiry time
- [ ] Endpoint deletes OAuth state after successful validation
- [ ] Endpoint redirects to frontend success page or returns JSON response
- [ ] Handle errors: invalid state, expired state, token exchange failure
- [ ] Typecheck passes

### US-007: Update IEspConnector Interface for OAuth
**Description:** As a developer, I need to update the ESP connector interface to support OAuth authentication in addition to API keys.

**Acceptance Criteria:**
- [ ] Update `IEspConnector` interface to add optional OAuth methods
- [ ] Add method `validateAccessToken(accessToken: string): Promise<boolean>` for OAuth validation
- [ ] Add method `fetchPublications(accessToken: string): Promise<Publication[]>` overload for OAuth
- [ ] Add method `fetchSubscribers(accessToken: string, publicationId: string): Promise<SubscriberData[]>` overload for OAuth
- [ ] Add method `getSubscriberCount(accessToken: string, publicationId: string): Promise<number>` overload for OAuth
- [ ] Keep existing API key methods for backward compatibility
- [ ] Typecheck passes

### US-008: Implement Kit OAuth Connector
**Description:** As a developer, I need a Kit connector that uses OAuth tokens instead of API keys to authenticate with the Kit API.

**Acceptance Criteria:**
- [ ] Create `KitConnector` class implementing `IEspConnector`
- [ ] Implement OAuth methods: `validateAccessToken`, `fetchPublications`, `fetchSubscribers`, `getSubscriberCount`
- [ ] Use Bearer token authentication in API requests: `Authorization: Bearer {accessToken}`
- [ ] Base URL: `https://api.kit.com/v1` (or actual Kit API base URL)
- [ ] Handle API errors (401, 403, 429, 500) appropriately
- [ ] Return 401 errors to trigger token refresh
- [ ] Typecheck passes

### US-009: Create OAuth Token Refresh Service
**Description:** As a developer, I need a service to refresh expired OAuth access tokens using refresh tokens.

**Acceptance Criteria:**
- [ ] Create `OAuthTokenRefreshService` with method `refreshToken(espConnection: EspConnection): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }>`
- [ ] Method calls ESP's token endpoint with: grant_type=refresh_token, refresh_token, client_id, client_secret
- [ ] Method updates `encryptedAccessToken`, `encryptedRefreshToken` (if new one provided), and `tokenExpiresAt` in database
- [ ] Method handles errors: invalid refresh token, expired refresh token
- [ ] Method throws appropriate exceptions for different error scenarios
- [ ] Typecheck passes

### US-010: Create Proactive Token Refresh Job
**Description:** As a developer, I need a scheduled job to proactively refresh OAuth tokens before they expire.

**Acceptance Criteria:**
- [ ] Create scheduled job (runs every 5 minutes) to check for tokens expiring soon
- [ ] Job finds all OAuth connections where `tokenExpiresAt` is within 10 minutes
- [ ] Job calls `OAuthTokenRefreshService.refreshToken()` for each connection
- [ ] Job updates database with new tokens and expiry times
- [ ] Job handles errors gracefully (logs, doesn't fail other refreshes)
- [ ] Job uses BullMQ queue for async processing
- [ ] Typecheck passes

### US-011: Update ESP Connector to Handle Token Refresh on 401
**Description:** As a developer, I need ESP connectors to automatically refresh tokens when API calls return 401 errors.

**Acceptance Criteria:**
- [ ] Update `EspConnectionService.getConnector()` to inject `OAuthTokenRefreshService`
- [ ] Update connector methods to catch 401 errors and trigger token refresh
- [ ] After successful refresh, retry the original API call with new token
- [ ] If refresh fails, throw appropriate error
- [ ] Limit retry to once per request to prevent infinite loops
- [ ] Typecheck passes

### US-012: Update EspConnectionService to Support OAuth
**Description:** As a developer, I need to update the ESP connection service to create OAuth-based connections and auto-detect publications.

**Acceptance Criteria:**
- [ ] Add method `createOAuthConnection(userId: string, espType: EspType, accessToken: string, refreshToken: string, expiresIn: number): Promise<EspConnection>`
- [ ] Method encrypts access token and refresh token before storing
- [ ] Method validates access token using connector
- [ ] Method calls `fetchPublications()` to get all publications
- [ ] Method stores all publication IDs in `publicationIds` JSONB array
- [ ] Method sets `authMethod: 'oauth'` and `tokenExpiresAt`
- [ ] Method sets `status: 'active'` if validation succeeds
- [ ] Update existing `createConnection()` to set `authMethod: 'api_key'` for API key connections
- [ ] Typecheck passes

### US-013: Update OAuth Callback to Create Connection
**Description:** As a developer, I need the OAuth callback endpoint to create ESP connections after successful token exchange.

**Acceptance Criteria:**
- [ ] Update OAuth callback endpoint to call `EspConnectionService.createOAuthConnection()` after token exchange
- [ ] Pass access token, refresh token, and expires_in from token response
- [ ] Handle case where user already has connection for this ESP (update existing or create new)
- [ ] After connection creation, trigger sync for all connected publications
- [ ] Redirect to frontend with success message or connection ID
- [ ] Handle errors: connection creation failure, sync trigger failure
- [ ] Typecheck passes

### US-014: Update SubscriberSyncService to Support OAuth
**Description:** As a developer, I need the sync service to use OAuth tokens when syncing OAuth-based connections.

**Acceptance Criteria:**
- [ ] Update `SubscriberSyncService.syncSubscribers()` to check `authMethod` field
- [ ] If `authMethod === 'oauth'`, decrypt access token and use for API calls
- [ ] If `authMethod === 'api_key'`, use existing API key flow
- [ ] For OAuth connections, sync all publications in `publicationIds` array
- [ ] Handle token refresh if access token is expired or returns 401
- [ ] Typecheck passes

### US-015: Update Frontend to Support OAuth Flow for Kit
**Description:** As a user, I want to connect Kit via OAuth from the frontend so I don't need to manually enter API keys.

**Acceptance Criteria:**
- [ ] Update onboarding page (`src/app/onboarding/page.tsx`) to show "Connect with OAuth" button for Kit
- [ ] Button calls `GET /api/esp-connections/oauth/initiate/kit` endpoint
- [ ] User is redirected to Kit's OAuth page
- [ ] After OAuth callback, user is redirected back to frontend
- [ ] Frontend shows success message and redirects to dashboard or ESP detail page
- [ ] Handle OAuth errors (user cancels, authorization fails)
- [ ] Update "New ESP Connection" page to support OAuth for Kit
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-016: Update Frontend API Client for OAuth
**Description:** As a developer, I need API client functions to initiate OAuth flow from the frontend.

**Acceptance Criteria:**
- [ ] Add `initiateOAuth(provider: 'kit' | 'mailchimp'): Promise<void>` function to API client
- [ ] Function calls `GET /api/esp-connections/oauth/initiate/:provider`
- [ ] Function handles redirect to OAuth provider
- [ ] Add proper TypeScript types
- [ ] Handle errors appropriately
- [ ] Typecheck passes

### US-017: Update Onboarding Flow for OAuth
**Description:** As a user, I want the onboarding flow to support OAuth connection for Kit instead of requiring API keys.

**Acceptance Criteria:**
- [ ] Update `src/app/onboarding/api-key/page.tsx` to detect if provider supports OAuth
- [ ] For Kit, show "Connect with OAuth" button instead of API key form
- [ ] For Beehiiv, show existing API key form
- [ ] After OAuth success, continue to Stripe onboarding step
- [ ] Handle OAuth callback redirect in onboarding flow
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-018: Add OAuth Connection Status Display
**Description:** As a user, I want to see that my connection uses OAuth and when the token was last refreshed.

**Acceptance Criteria:**
- [ ] Update ESP detail page to display `authMethod` (OAuth vs API Key)
- [ ] For OAuth connections, display token expiry time and last refresh time
- [ ] Show all connected publications for OAuth connections
- [ ] Display connection status and sync status
- [ ] Uses shadcn components (Card, Badge)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-019: Add Manual Token Refresh Endpoint
**Description:** As a user, I want to manually refresh my OAuth token if automatic refresh fails.

**Acceptance Criteria:**
- [ ] Add `POST /esp-connections/:id/refresh-token` endpoint to `EspConnectionController`
- [ ] Endpoint requires authentication and validates user owns the connection
- [ ] Endpoint calls `OAuthTokenRefreshService.refreshToken()`
- [ ] Endpoint returns updated connection info
- [ ] Handle errors: connection not found, not OAuth connection, refresh token expired
- [ ] Typecheck passes

### US-020: Implement Mailchimp OAuth Connector
**Description:** As a developer, I need a Mailchimp connector that uses OAuth tokens to authenticate with the Mailchimp API.

**Acceptance Criteria:**
- [ ] Create `MailchimpConnector` class implementing `IEspConnector`
- [ ] Implement OAuth methods: `validateAccessToken`, `fetchPublications`, `fetchSubscribers`, `getSubscriberCount`
- [ ] Use Bearer token authentication: `Authorization: Bearer {accessToken}`
- [ ] Base URL: `https://{dc}.api.mailchimp.com/3.0` (dc from OAuth token or API response)
- [ ] Handle Mailchimp-specific API structure and pagination
- [ ] Handle API errors (401, 403, 429, 500) appropriately
- [ ] Return 401 errors to trigger token refresh
- [ ] Typecheck passes

### US-021: Add Mailchimp OAuth Support to Frontend
**Description:** As a user, I want to connect Mailchimp via OAuth from the frontend.

**Acceptance Criteria:**
- [ ] Update onboarding page to show "Connect with OAuth" button for Mailchimp
- [ ] Update "New ESP Connection" page to support OAuth for Mailchimp
- [ ] Button calls `GET /api/esp-connections/oauth/initiate/mailchimp` endpoint
- [ ] User is redirected to Mailchimp's OAuth page
- [ ] After OAuth callback, user is redirected back with success
- [ ] Handle OAuth errors appropriately
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-022: Update EspConnectionService to Handle Multiple Publications
**Description:** As a developer, I need the service to properly handle syncing multiple publications from a single OAuth connection.

**Acceptance Criteria:**
- [ ] Update `SubscriberSyncService.syncSubscribers()` to iterate through `publicationIds` array for OAuth connections
- [ ] Create separate sync history records for each publication synced
- [ ] Update subscriber records to include publication ID in metadata
- [ ] Handle errors per publication (continue syncing other publications if one fails)
- [ ] Update sync status to reflect overall connection status
- [ ] Typecheck passes

### US-023: Add OAuth Disconnect/Reconnect Functionality
**Description:** As a user, I want to disconnect and reconnect my OAuth connection if there are issues.

**Acceptance Criteria:**
- [ ] Add `DELETE /esp-connections/:id` endpoint to `EspConnectionController`
- [ ] Endpoint requires authentication and validates user owns the connection
- [ ] Endpoint deletes ESP connection and all associated subscribers
- [ ] Add "Disconnect" button to ESP detail page for OAuth connections
- [ ] Button shows confirmation dialog before deletion
- [ ] After deletion, redirect to ESP list page
- [ ] Handle errors appropriately
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: System must support OAuth 2.0 authorization code flow for Kit and Mailchimp
- FR-2: System must store OAuth state in database with expiration (10 minutes) to prevent CSRF attacks
- FR-3: System must encrypt OAuth access tokens and refresh tokens before storing in database
- FR-4: System must automatically detect all publications from OAuth-connected accounts
- FR-5: System must store multiple publication IDs as JSON array in `publicationIds` field for OAuth connections
- FR-6: System must support both OAuth (`authMethod: 'oauth'`) and API key (`authMethod: 'api_key'`) authentication methods
- FR-7: System must proactively refresh OAuth tokens before expiry (within 10 minutes of expiration)
- FR-8: System must reactively refresh OAuth tokens when API calls return 401 errors
- FR-9: System must auto-trigger sync for all connected publications after successful OAuth connection
- FR-10: System must maintain backward compatibility with API key authentication for Beehiiv
- FR-11: System must validate OAuth state on callback to prevent CSRF attacks
- FR-12: System must handle token refresh failures gracefully (log errors, allow manual refresh)
- FR-13: System must sync all publications from OAuth connections, not just one
- FR-14: System must clean up expired OAuth states automatically (hourly job)
- FR-15: System must support Kit OAuth integration first, then Mailchimp

## Non-Goals

- No support for OAuth for Beehiiv (API key only)
- No support for API keys for Kit or Mailchimp (OAuth only)
- No OAuth token rotation or revocation webhooks (rely on refresh token flow)
- No support for multiple OAuth accounts per user per ESP (one OAuth connection per ESP per user)
- No UI for viewing or editing OAuth token details (read-only display)
- No support for OAuth scopes customization (use predefined scopes)
- No support for OAuth PKCE flow (standard authorization code flow only)
- No automatic re-authentication if refresh token expires (user must reconnect)

## Design Considerations

### OAuth Flow Architecture
- Use standard OAuth 2.0 authorization code flow
- Store OAuth state in database with user ID and expiration
- Callback URL: `/api/esp-connections/oauth/callback/{provider}`
- Redirect to frontend after successful connection

### Token Management
- Encrypt access tokens and refresh tokens using existing `EncryptionService`
- Store token expiry time to enable proactive refresh
- Use both proactive (scheduled job) and reactive (on 401) refresh strategies
- Limit token refresh retries to prevent infinite loops

### Multi-Publication Support
- Store publication IDs as JSONB array: `["pub1", "pub2", "pub3"]`
- Sync all publications from OAuth connection
- Create separate sync history records per publication
- Display all publications in UI

### Backward Compatibility
- Keep existing API key flow for Beehiiv unchanged
- Add `authMethod` field to distinguish authentication types
- Make `encryptedApiKey` nullable (OAuth connections don't need it)
- Update connectors to support both authentication methods

### Security
- OAuth state expires after 10 minutes
- Validate state on callback to prevent CSRF
- Encrypt all tokens at rest
- Never expose tokens in API responses
- Clean up expired OAuth states regularly

## Technical Considerations

### Dependencies
- No new npm packages required (use existing `@nestjs/axios` for HTTP requests)
- Use existing `EncryptionService` for token encryption
- Use existing BullMQ for scheduled token refresh jobs

### Environment Variables
- `KIT_OAUTH_CLIENT_ID` - Kit OAuth client ID
- `KIT_OAUTH_CLIENT_SECRET` - Kit OAuth client secret
- `KIT_OAUTH_AUTHORIZATION_URL` - Kit OAuth authorization endpoint
- `KIT_OAUTH_TOKEN_URL` - Kit OAuth token endpoint
- `KIT_OAUTH_SCOPES` - Comma-separated list of OAuth scopes for Kit
- `MAILCHIMP_OAUTH_CLIENT_ID` - Mailchimp OAuth client ID
- `MAILCHIMP_OAUTH_CLIENT_SECRET` - Mailchimp OAuth client secret
- `MAILCHIMP_OAUTH_AUTHORIZATION_URL` - Mailchimp OAuth authorization endpoint
- `MAILCHIMP_OAUTH_TOKEN_URL` - Mailchimp OAuth token endpoint
- `MAILCHIMP_OAUTH_SCOPES` - Comma-separated list of OAuth scopes for Mailchimp
- `BACKEND_URL` - Backend base URL for OAuth callback (e.g., `https://api.example.com`)

### Database Migrations
- Create `oauth_states` table
- Update `esp_connections` table: add `authMethod`, make `encryptedApiKey` nullable, add OAuth token fields, add `publicationIds` JSONB field, make `publicationId` nullable
- Add indexes for performance

### API Endpoints
- `GET /api/esp-connections/oauth/initiate/:provider` - Initiate OAuth flow
- `GET /api/esp-connections/oauth/callback/:provider` - OAuth callback handler
- `POST /api/esp-connections/:id/refresh-token` - Manual token refresh
- Existing endpoints remain unchanged for backward compatibility

### Error Handling
- Invalid OAuth state: return 400 Bad Request
- Expired OAuth state: return 400 Bad Request with clear message
- Token exchange failure: return 401 Unauthorized
- Refresh token expired: return 401 Unauthorized, require re-authentication
- API call 401: automatically refresh token and retry once

### Performance
- Proactive token refresh runs every 5 minutes (checks tokens expiring within 10 minutes)
- OAuth state cleanup runs hourly
- Token refresh uses BullMQ queue for async processing
- Limit concurrent token refreshes to prevent rate limiting

## Success Metrics

- Users can successfully connect Kit accounts via OAuth without entering API keys
- OAuth tokens are automatically refreshed before expiry (proactive refresh)
- OAuth tokens are automatically refreshed on 401 errors (reactive refresh)
- All publications from OAuth accounts are automatically detected and connected
- Sync automatically triggers for all publications after OAuth connection
- API key authentication for Beehiiv continues to work without changes
- OAuth state validation prevents CSRF attacks
- Token refresh failures are logged and can be manually retried
- System supports both Kit and Mailchimp OAuth integrations

## Open Questions

- What are the exact OAuth endpoints and scopes for Kit API? (Need to verify with Kit documentation)
- What are the exact OAuth endpoints and scopes for Mailchimp API? (Need to verify with Mailchimp documentation)
- Should we support reconnecting OAuth accounts if refresh token expires, or require full re-authentication?
- How should we handle rate limiting from ESP APIs during token refresh?
- Should we add webhook support for OAuth token revocation in the future?
- What is the maximum number of publications we should support per OAuth connection?
- Should we add UI to show which publications are syncing from an OAuth connection?
- How should we handle OAuth connections where user revokes access on ESP side?
