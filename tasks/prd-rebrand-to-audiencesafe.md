# PRD: Rebrand from SubscriberNest to AudienceSafe

## Introduction

Rebrand the entire application from "SubscriberNest" to "AudienceSafe" across all user-facing text, documentation, code comments, and configuration. Update domain references from `subscribernest.com` and `nest.miguelncorreia.com` to `audiencesafe.com`. This is a comprehensive rebranding effort to establish the new brand identity throughout the codebase.

## Goals

- Replace all instances of "SubscriberNest" with "AudienceSafe" in user-facing content
- Replace all instances of "Subscriber Nest" with "AudienceSafe" in user-facing content
- Update domain references to `audiencesafe.com`
- Update email addresses to use `audiencesafe.com` domain
- Ensure consistent branding across frontend, backend, and documentation
- Maintain functionality while updating branding

## User Stories

### US-001: Update frontend homepage branding
**Description:** As a user, I want to see "AudienceSafe" branding on the homepage so the application reflects the new brand identity.

**Acceptance Criteria:**
- [ ] Navigation logo text shows "AudienceSafe" instead of "SubscriberNest"
- [ ] All homepage text references updated to "AudienceSafe"
- [ ] Domain reference updated to "audiencesafe.com" in homepage
- [ ] Footer copyright shows "AudienceSafe"
- [ ] FAQ section references updated to "AudienceSafe"
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-002: Update frontend metadata and layout
**Description:** As a user, I want the browser tab and metadata to show "AudienceSafe" so the brand is consistent in browser UI.

**Acceptance Criteria:**
- [ ] Page title in `layout.tsx` updated to "AudienceSafe"
- [ ] Meta description updated if it references SubscriberNest
- [ ] Typecheck passes

### US-003: Update dashboard welcome message
**Description:** As a user, I want to see "AudienceSafe" in the dashboard welcome message so the branding is consistent.

**Acceptance Criteria:**
- [ ] Dashboard welcome message shows "Welcome to AudienceSafe!" instead of "Welcome to SubscriberNest!"
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-004: Update onboarding flow branding
**Description:** As a user, I want to see "AudienceSafe" branding during onboarding so the experience is consistent.

**Acceptance Criteria:**
- [ ] Stripe onboarding page references updated to "AudienceSafe"
- [ ] All onboarding text updated to use "AudienceSafe"
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Update backend API service response
**Description:** As a developer, I want the API service to return "AudienceSafe API" so the backend reflects the new brand.

**Acceptance Criteria:**
- [ ] `app.service.ts` returns "AudienceSafe API" instead of "SubscriberNest API"
- [ ] Typecheck passes

### US-006: Update email templates and service
**Description:** As a user, I want to receive emails with "AudienceSafe" branding so the email experience is consistent.

**Acceptance Criteria:**
- [ ] Email subject lines updated to reference "AudienceSafe"
- [ ] Email template footer shows "AudienceSafe" copyright
- [ ] Email preview text updated to reference "AudienceSafe"
- [ ] Default email address updated to use `audiencesafe.com` domain
- [ ] Typecheck passes

### US-007: Update Stripe product name
**Description:** As a user, I want Stripe billing to show "AudienceSafe" so billing reflects the new brand.

**Acceptance Criteria:**
- [ ] Stripe product name updated to "AudienceSafe Usage" instead of "SubscriberNest Usage"
- [ ] Typecheck passes

### US-008: Update documentation files
**Description:** As a developer, I want documentation to reference "AudienceSafe" so it's consistent with the codebase.

**Acceptance Criteria:**
- [ ] README.md title and all references updated to "AudienceSafe"
- [ ] AGENTS.md title and references updated to "AudienceSafe"
- [ ] DEPLOYMENT.md title and references updated to "AudienceSafe"
- [ ] All task PRD files updated to reference "AudienceSafe" where applicable

### US-009: Update Docker Compose configuration
**Description:** As a developer, I want Docker container names and email defaults to use "AudienceSafe" branding.

**Acceptance Criteria:**
- [ ] Container names updated (e.g., `api_audience_safe` instead of `api_subscriber_nest`)
- [ ] Default email addresses updated to use `audiencesafe.com` domain
- [ ] Network names updated if they reference "subscriber_nest"
- [ ] Docker Compose file validates successfully

### US-010: Update code comments and API client documentation
**Description:** As a developer, I want code comments to reference "AudienceSafe" so documentation is consistent.

**Acceptance Criteria:**
- [ ] API client file comments updated to reference "AudienceSafe"
- [ ] All code comments referencing "SubscriberNest" updated
- [ ] Typecheck passes

### US-011: Update Ralph/agent configuration files
**Description:** As a developer, I want agent configuration files to reference "AudienceSafe" so automated tools use the correct branding.

**Acceptance Criteria:**
- [ ] `ralph/prd.json` project name updated to "AudienceSafe"
- [ ] All archived PRD JSON files updated to "AudienceSafe"
- [ ] `ralph/prompt.md` updated to reference "AudienceSafe"

### US-012: Update encryption service salt
**Description:** As a developer, I want encryption salt to reference "AudienceSafe" for consistency.

**Acceptance Criteria:**
- [ ] Encryption service salt updated from 'subscriber-nest-salt' to 'audience-safe-salt'
- [ ] Verify encryption/decryption still works correctly
- [ ] Typecheck passes

## Functional Requirements

- FR-1: Replace all instances of "SubscriberNest" with "AudienceSafe" in user-facing text
- FR-2: Replace all instances of "Subscriber Nest" with "AudienceSafe" in user-facing text
- FR-3: Update domain references from `subscribernest.com` to `audiencesafe.com`
- FR-4: Update email domain from `nest.miguelncorreia.com` to `audiencesafe.com`
- FR-5: Update default email addresses to use `@audiencesafe.com` domain
- FR-6: Update Docker container names to use "audience_safe" naming convention
- FR-7: Update all documentation files (README, AGENTS, DEPLOYMENT, PRDs)
- FR-8: Update code comments and API documentation
- FR-9: Update Ralph/agent configuration files
- FR-10: Update encryption salt identifier
- FR-11: Update Stripe product name in billing service

## Non-Goals

- **Package name changes:** Do NOT change the `package.json` name from "subscriber-nest" (this could break dependencies and workspace configurations)
- **Database name changes:** Do NOT change database names (e.g., `subscriber_nest` database name) as this would require migration
- **Repository/folder structure:** Do NOT rename the repository or folder structure (e.g., `subscriber-nest` directory name)
- **Environment variable names:** Do NOT change environment variable names (e.g., `DATABASE_NAME=subscriber_nest` can stay as-is)
- **URL paths:** Do NOT change API endpoint paths or route names
- **Git history:** Do NOT attempt to rewrite git history

## Design Considerations

- Maintain all existing styling and UI components
- Brand name should be consistent: "AudienceSafe" (one word, camelCase in code, proper case in UI)
- Domain should be consistently `audiencesafe.com` (lowercase, no www unless specified)
- Email addresses should follow pattern: `{purpose}@audiencesafe.com` (e.g., `onboarding@audiencesafe.com`)

## Technical Considerations

- **Search and replace:** Use case-insensitive search to catch all variations (SubscriberNest, Subscriber Nest, subscriber-nest, etc.)
- **Testing:** After changes, verify:
  - Frontend renders correctly
  - Email sending works with new domain
  - Stripe integration works with updated product name
  - Docker containers start successfully
  - No broken references in code
- **Encryption salt change:** Changing the encryption salt will invalidate existing encrypted data. Consider:
  - Whether to migrate existing encrypted data
  - Or document this as a breaking change for existing deployments
- **Email domain:** Ensure `audiencesafe.com` domain is configured in Resend (or email service) before deploying
- **Stripe product:** May need to create new Stripe product or update existing one with new name

## Success Metrics

- Zero instances of "SubscriberNest" or "Subscriber Nest" in user-facing content
- All domain references point to `audiencesafe.com`
- All email addresses use `@audiencesafe.com` domain
- Application builds and runs successfully after rebranding
- No broken links or references
- Consistent branding across all touchpoints

## Open Questions

- Should we update the encryption salt? (This will break existing encrypted data - may need migration strategy)
- Should Docker container names be updated? (May affect existing deployments)
- Do we need to update Stripe product in production, or create a new one?
- Should we update environment variable default values (e.g., `DATABASE_NAME`)?
- Are there any external services (analytics, monitoring) that reference "SubscriberNest" that need updating?
