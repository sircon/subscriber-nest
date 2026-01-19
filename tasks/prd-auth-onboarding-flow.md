# PRD: Authentication and Onboarding Flow

## Introduction

Implement a complete email-based authentication system with onboarding flow for AudienceSafe. Users will authenticate via email verification codes, and new users will be guided through an onboarding process to connect their Email Service Provider (ESP) before accessing the main dashboard. This ensures all users have their ESP configured before using the application.

## Goals

- Enable secure email-based authentication without passwords
- Automatically create new users when they verify their email for the first time
- Guide new users through ESP selection and API key configuration
- Ensure users cannot access the dashboard until onboarding is complete
- Support multiple ESP connections per user
- Use Resend for reliable email delivery
- Build professional email templates with react-email
- Create a polished UI using shadcn components

## User Stories

### US-001: Create User and Session entities
**Description:** As a developer, I need database entities to store user accounts, email verification codes, and active sessions so authentication data persists.

**Acceptance Criteria:**
- [ ] Create `User` entity with fields: `id`, `email` (unique), `isOnboarded` (boolean, default false), `createdAt`, `updatedAt`
- [ ] Create `VerificationCode` entity with fields: `id`, `email`, `code` (6-digit string), `expiresAt` (timestamp), `used` (boolean, default false), `createdAt`
- [ ] Create `Session` entity with fields: `id`, `userId` (foreign key to User), `token` (unique string), `expiresAt` (timestamp), `createdAt`
- [ ] Generate and run migration successfully
- [ ] Typecheck passes

### US-002: Create ESP Connection entity
**Description:** As a developer, I need to store ESP connection details (provider type and API key) so users can connect multiple ESPs.

**Acceptance Criteria:**
- [ ] Create `EspConnection` entity with fields: `id`, `userId` (foreign key to User), `provider` (enum: 'kit', 'beehiiv', 'mailchimp', etc.), `apiKey` (encrypted string), `isActive` (boolean, default true), `createdAt`, `updatedAt`
- [ ] Add relationship: User has many EspConnections
- [ ] Generate and run migration successfully
- [ ] Typecheck passes

### US-003: Set up Resend email service
**Description:** As a developer, I need Resend configured in the backend to send verification emails.

**Acceptance Criteria:**
- [ ] Install `@resend/node` package
- [ ] Add `RESEND_API_KEY` to backend `.env.example` and document it
- [ ] Create `EmailService` with method to send verification code emails
- [ ] Service uses Resend API to send emails
- [ ] Typecheck passes

### US-004: Create react-email verification code template
**Description:** As a developer, I need a professional email template for verification codes using react-email.

**Acceptance Criteria:**
- [ ] Install `react-email` and `@react-email/components` packages
- [ ] Create email template component in `apps/backend/src/emails/verification-code-email.tsx`
- [ ] Template displays 6-digit code prominently
- [ ] Template includes branding and clear instructions
- [ ] Template renders to HTML correctly
- [ ] Typecheck passes

### US-005: Generate and send verification code
**Description:** As a user, I want to request a verification code by entering my email so I can log in.

**Acceptance Criteria:**
- [ ] Create `POST /auth/send-code` endpoint that accepts `{ email: string }`
- [ ] Endpoint generates random 6-digit numeric code
- [ ] Endpoint stores code in database with 10-minute expiration
- [ ] Endpoint enforces rate limit: max 3 codes per email per hour
- [ ] Endpoint sends email via Resend using react-email template
- [ ] Returns `{ success: true }` on success
- [ ] Returns appropriate error if rate limited
- [ ] Typecheck passes

### US-006: Verify code and create session
**Description:** As a user, I want to enter my verification code to log in and create a session.

**Acceptance Criteria:**
- [ ] Create `POST /auth/verify-code` endpoint that accepts `{ email: string, code: string }`
- [ ] Endpoint validates code exists, matches email, is not expired, and not used
- [ ] If user doesn't exist, create new User with `isOnboarded: false`
- [ ] If user exists, use existing user
- [ ] Mark verification code as used
- [ ] Create new Session with unique token and expiration (e.g., 30 days)
- [ ] Return `{ token: string, user: { id, email, isOnboarded } }`
- [ ] Return appropriate errors for invalid/expired/used codes
- [ ] Typecheck passes

### US-007: Session validation middleware
**Description:** As a developer, I need middleware to validate session tokens on protected routes.

**Acceptance Criteria:**
- [ ] Create `AuthGuard` that validates session token from request headers
- [ ] Guard checks token exists in database and is not expired
- [ ] Guard attaches user object to request
- [ ] Guard can be applied to controllers/routes via `@UseGuards(AuthGuard)`
- [ ] Returns 401 if token invalid or missing
- [ ] Typecheck passes

### US-008: Get current user endpoint
**Description:** As a frontend developer, I need an endpoint to check if user is authenticated and get their status.

**Acceptance Criteria:**
- [ ] Create `GET /auth/me` endpoint protected by AuthGuard
- [ ] Returns `{ user: { id, email, isOnboarded } }`
- [ ] Returns 401 if not authenticated
- [ ] Typecheck passes

### US-009: Logout endpoint
**Description:** As a user, I want to log out so my session is invalidated.

**Acceptance Criteria:**
- [ ] Create `POST /auth/logout` endpoint protected by AuthGuard
- [ ] Endpoint deletes session from database
- [ ] Returns `{ success: true }`
- [ ] Typecheck passes

### US-010: Create ESP connection endpoint
**Description:** As a user, I want to save my ESP provider and API key during onboarding.

**Acceptance Criteria:**
- [ ] Create `POST /esp-connections` endpoint protected by AuthGuard
- [ ] Accepts `{ provider: string, apiKey: string }`
- [ ] Validates provider is in allowed list
- [ ] Encrypts API key before storing (use environment variable for encryption key)
- [ ] Creates EspConnection linked to current user
- [ ] Returns `{ id, provider, createdAt }` (without API key)
- [ ] Typecheck passes
- [ ] **TODO:** Add API key validation when user clicks "Sync subscribers to vault" (skip for now)

### US-011: Mark user as onboarded endpoint
**Description:** As a user, after completing onboarding I want my account marked as onboarded.

**Acceptance Criteria:**
- [ ] Create `POST /auth/complete-onboarding` endpoint protected by AuthGuard
- [ ] Endpoint sets user's `isOnboarded` to `true`
- [ ] Returns `{ success: true, user: { id, email, isOnboarded: true } }`
- [ ] Typecheck passes

### US-012: Get user ESP connections endpoint
**Description:** As a user, I want to see my connected ESPs.

**Acceptance Criteria:**
- [ ] Create `GET /esp-connections` endpoint protected by AuthGuard
- [ ] Returns array of user's ESP connections (without API keys)
- [ ] Returns `[{ id, provider, isActive, createdAt }, ...]`
- [ ] Typecheck passes

### US-013: Login page UI
**Description:** As a user, I want a login page where I can enter my email to receive a verification code.

**Acceptance Criteria:**
- [ ] Create `src/app/login/page.tsx` with email input form
- [ ] Form uses shadcn Input and Button components
- [ ] Form calls `POST /auth/send-code` on submit
- [ ] Shows loading state while sending
- [ ] Shows success message after code sent
- [ ] Shows error message if request fails
- [ ] Redirects to `/verify-code` with email in query params after success
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-014: Verify code page UI
**Description:** As a user, I want a page to enter my verification code after requesting it.

**Acceptance Criteria:**
- [ ] Create `src/app/verify-code/page.tsx` with 6-digit code input
- [ ] Page reads email from query params
- [ ] Uses shadcn Input component (or code input component)
- [ ] Form calls `POST /auth/verify-code` on submit
- [ ] Shows loading state while verifying
- [ ] On success, stores token and redirects based on `isOnboarded`:
  - If `isOnboarded: false` → redirect to `/onboarding`
  - If `isOnboarded: true` → redirect to `/dashboard`
- [ ] Shows error message if code invalid/expired
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-015: Onboarding provider selection page
**Description:** As a new user, I want to select my email service provider during onboarding.

**Acceptance Criteria:**
- [ ] Create `src/app/onboarding/page.tsx` with provider selection UI
- [ ] Shows list of providers: Kit, beehiiv, Mailchimp, and others (use cards or buttons)
- [ ] Uses shadcn Card or Button components for provider options
- [ ] Each provider shows name and optional logo/icon
- [ ] On selection, stores provider choice and redirects to `/onboarding/api-key?provider={provider}`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-016: Onboarding API key entry page
**Description:** As a new user, I want to enter my ESP API key to complete onboarding.

**Acceptance Criteria:**
- [ ] Create `src/app/onboarding/api-key/page.tsx` with API key input form
- [ ] Page reads provider from query params
- [ ] Shows selected provider name
- [ ] Form has API key input (password type for security)
- [ ] Form has "Sync subscribers to vault" CTA button
- [ ] On submit, calls `POST /esp-connections` to save connection
- [ ] After saving, calls `POST /auth/complete-onboarding`
- [ ] On success, redirects to `/dashboard`
- [ ] Shows loading and error states
- [ ] Uses shadcn components (Input, Button, Card)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-017: Authentication context and hooks
**Description:** As a frontend developer, I need React context and hooks to manage auth state across the app.

**Acceptance Criteria:**
- [ ] Create `src/contexts/AuthContext.tsx` with provider
- [ ] Context stores: `user`, `token`, `loading`, `isAuthenticated`
- [ ] Context provides: `login(token, user)`, `logout()`, `checkAuth()`
- [ ] Create `useAuth()` hook that returns context values
- [ ] On mount, checks `GET /auth/me` to restore session
- [ ] Stores token in httpOnly cookie or secure storage
- [ ] Typecheck passes

### US-018: Protected route middleware
**Description:** As a developer, I need middleware to protect routes and redirect unauthenticated users.

**Acceptance Criteria:**
- [ ] Create `src/middleware.ts` (Next.js middleware)
- [ ] Middleware checks for auth token/session
- [ ] If not authenticated and trying to access protected route, redirect to `/login`
- [ ] If authenticated but `isOnboarded: false` and not on onboarding pages, redirect to `/onboarding`
- [ ] Allows access to `/login` and `/verify-code` without auth
- [ ] Allows access to `/onboarding/*` if authenticated but not onboarded
- [ ] Typecheck passes

### US-019: Dashboard page (placeholder)
**Description:** As a user, I want to see a dashboard after completing onboarding.

**Acceptance Criteria:**
- [ ] Create `src/app/dashboard/page.tsx` as protected route
- [ ] Page shows welcome message with user email
- [ ] Page shows connected ESP(s) from `GET /esp-connections`
- [ ] Uses shadcn components for layout
- [ ] Page is only accessible if authenticated and onboarded
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-020: API client with auth
**Description:** As a frontend developer, I need an API client that automatically includes auth tokens.

**Acceptance Criteria:**
- [ ] Create `src/lib/api.ts` with API client functions
- [ ] Client reads `NEXT_PUBLIC_API_URL` from environment
- [ ] All requests include auth token in headers (from AuthContext)
- [ ] Handles 401 errors by clearing auth and redirecting to login
- [ ] Provides typed functions for all auth and ESP endpoints
- [ ] Typecheck passes

## Functional Requirements

- FR-1: Users can request a verification code by entering their email address
- FR-2: System generates random 6-digit numeric codes that expire in 10 minutes
- FR-3: System enforces rate limiting: maximum 3 codes per email per hour
- FR-4: System sends verification codes via email using Resend
- FR-5: Users can verify their code to authenticate and create a session
- FR-6: New users are automatically created when they verify their email for the first time
- FR-7: Sessions are stored in the database with unique tokens and expiration dates
- FR-8: Users with `isOnboarded: false` are redirected to onboarding flow
- FR-9: Onboarding flow requires selecting an ESP provider and entering an API key
- FR-10: Users can connect multiple ESP providers to their account
- FR-11: API keys are encrypted before storage in the database
- FR-12: After completing onboarding, users are redirected to the dashboard
- FR-13: All protected routes require valid authentication
- FR-14: Unauthenticated users are redirected to the login page
- FR-15: Email templates are built using react-email components

## Non-Goals

- Password-based authentication (email codes only)
- Social login (OAuth, Google, etc.)
- Two-factor authentication beyond email verification
- Email verification code resend functionality (users must request new code)
- API key validation during onboarding (TODO: add when implementing sync)
- ESP-specific API integration beyond storing credentials
- Password reset flow (not applicable for code-based auth)
- User profile management (name, avatar, etc.)
- Email change functionality

## Design Considerations

- **UI Components:** Use shadcn/ui components consistently (Button, Input, Card, etc.)
- **Email Design:** Use react-email for professional, responsive email templates
- **Onboarding Flow:** Keep it simple and focused - provider selection → API key → done
- **Error Handling:** Show clear, user-friendly error messages for invalid codes, rate limits, etc.
- **Loading States:** Show loading indicators during API calls
- **Responsive Design:** Ensure all pages work on mobile and desktop
- **Branding:** Maintain AudienceSafe branding in emails and UI

## Technical Considerations

- **Backend:**
  - Use NestJS modules for Auth, Email, and ESP connections
  - Store sessions in PostgreSQL via TypeORM
  - Use Resend API for email delivery (requires API key in env)
  - Encrypt API keys using Node.js crypto (store encryption key in env)
  - Use TypeORM migrations for all schema changes

- **Frontend:**
  - Use Next.js App Router for routing
  - Implement middleware for route protection
  - Use React Context for auth state management
  - Store session tokens securely (consider httpOnly cookies or secure storage)
  - Use shadcn components from existing component library

- **Email:**
  - Build templates with react-email
  - Render templates to HTML in backend before sending via Resend
  - Include AudienceSafe branding in email templates

- **Security:**
  - Rate limit email code requests to prevent abuse
  - Encrypt sensitive data (API keys) at rest
  - Use secure session tokens (random, long strings)
  - Validate all inputs on backend
  - Set appropriate session expiration (e.g., 30 days)

- **Environment Variables:**
  - Backend: `RESEND_API_KEY`, `ENCRYPTION_KEY` (for API key encryption), `SESSION_SECRET`
  - Frontend: `NEXT_PUBLIC_API_URL`

## Success Metrics

- Users can complete login flow (request code → verify → authenticated) in under 2 minutes
- New users can complete onboarding (select provider → enter API key → dashboard) in under 5 minutes
- Email delivery success rate > 95% (via Resend)
- Zero security incidents related to authentication
- All protected routes properly enforce authentication and onboarding status

## Open Questions

- Should verification codes be case-sensitive? (No - numeric codes only)
- Should we support "Remember me" functionality for longer sessions? (Future enhancement)
- What happens if a user tries to connect the same ESP twice? (Allow multiple connections or update existing?)
- Should we send welcome emails after account creation? (Future enhancement)
- How should we handle ESP provider logos/icons in the UI? (Use simple text labels for MVP)
