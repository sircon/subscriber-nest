# PRD: Homepage Update - Audience Safety & Pricing Messaging

## Introduction

Update the AudienceSafe homepage to accurately reflect the pricing model (credit card required, no free trial), emphasize the audience safety value proposition, and highlight the backup/download feature as a key benefit. The messaging should position the service as an affordable, accessible solution that protects users' most valuable asset—their subscriber audience.

## Goals

- Remove all references to free trials and "no credit card required" messaging
- Prominently display exact pricing ($5/month) to emphasize affordability and accessibility
- Reframe value proposition around audience safety and protection
- Highlight daily automatic sync as a key feature
- Mention backup/download capability in benefits section (not as primary feature)
- Maintain balanced tone: professional, friendly, and security-focused
- Update all homepage sections (hero, pricing, features, benefits, FAQ) for consistency

## User Stories

### US-001: Update hero section messaging
**Description:** As a visitor, I want to see accurate pricing and value proposition in the hero section so I understand what I'm signing up for.

**Acceptance Criteria:**
- [ ] Change headline to emphasize audience safety/protection angle
- [ ] Update subheadline to mention daily sync and backup capability
- [ ] Change CTA button from "Get Started Free" to "Get Started" or "Sign Up Now"
- [ ] Remove "No credit card required" text
- [ ] Add messaging about credit card requirement (e.g., "Credit card required to start")
- [ ] Update badge text if needed to align with new messaging
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-002: Update pricing section to remove trial messaging
**Description:** As a visitor, I want to see accurate pricing information without misleading free trial claims so I can make an informed decision.

**Acceptance Criteria:**
- [ ] Remove "Start your free trial" button text
- [ ] Change CTA button to "Get Started" or "Sign Up Now"
- [ ] Remove "14-day free trial · Cancel anytime" text below button
- [ ] Add messaging about credit card requirement (e.g., "Credit card required" or "Start protecting your audience today")
- [ ] Keep exact pricing ($5/month) prominently displayed
- [ ] Add copy emphasizing affordability (e.g., "Super affordable pricing to keep your audience safe")
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-003: Update hero features row with daily sync messaging
**Description:** As a visitor, I want to see that subscribers are synced daily so I understand the service keeps my data current.

**Acceptance Criteria:**
- [ ] Update "Auto-sync daily" feature text to emphasize frequency (e.g., "Synced every day" or "Daily automatic sync")
- [ ] Ensure messaging is clear and prominent
- [ ] Maintain visual consistency with existing feature icons
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-004: Add audience safety messaging to hero subheadline
**Description:** As a visitor, I want to understand that my audience is my most valuable asset and this service protects it, so I see the core value proposition immediately.

**Acceptance Criteria:**
- [ ] Rewrite hero subheadline to emphasize audience as most important asset
- [ ] Include messaging about keeping audience safe/secure
- [ ] Mention backup capability (e.g., "backup of your updated list")
- [ ] Reference ability to download and import if ESP has issues
- [ ] Keep copy concise and impactful
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Add backup/download benefit to features section
**Description:** As a visitor, I want to know about the backup and download capability so I understand I can always access my data even if my ESP has issues.

**Acceptance Criteria:**
- [ ] Add backup/download feature to benefits/features list (not as primary hero feature)
- [ ] Include messaging about downloading updated list anytime
- [ ] Mention ability to import into another ESP if needed
- [ ] Frame as safety/security benefit (e.g., "Always have a backup")
- [ ] Position as part of audience protection value proposition
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: Update FAQ section to remove trial references
**Description:** As a visitor, I want accurate information in the FAQ so I don't see conflicting messaging about free trials.

**Acceptance Criteria:**
- [ ] Update FAQ question about free tier to remove free trial mention
- [ ] Change answer to reflect credit card required, no free trial
- [ ] Emphasize affordable pricing and accessibility
- [ ] Update any other FAQ answers that mention free trial
- [ ] Ensure all FAQ answers are consistent with new messaging
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: Add FAQ about backup/download feature
**Description:** As a visitor, I want to understand the backup and download capability so I know what happens if my ESP has issues.

**Acceptance Criteria:**
- [ ] Add new FAQ question about backup/download feature
- [ ] Answer should explain: daily sync creates backup, can download anytime, can import to another ESP
- [ ] Frame as safety benefit for audience protection
- [ ] Position as insurance against ESP issues
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Update pricing section header copy
**Description:** As a visitor, I want to see messaging that emphasizes affordability and accessibility so I understand the pricing is designed to be accessible to everyone.

**Acceptance Criteria:**
- [ ] Update pricing section header to mention affordability/accessibility
- [ ] Add copy about covering costs while being accessible
- [ ] Maintain professional tone while emphasizing value
- [ ] Keep existing "Simple, transparent pricing" if appropriate, or update to reflect new angle
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Remove all instances of "free trial", "no credit card required", and "14-day free trial" text from homepage
- FR-2: Update hero section CTA button text from "Get Started Free" to "Get Started" or "Sign Up Now"
- FR-3: Add credit card requirement messaging near CTA buttons (e.g., "Credit card required" or "Credit card required to start")
- FR-4: Prominently display exact pricing ($5/month) in hero section or pricing section
- FR-5: Update hero subheadline to emphasize audience as most valuable asset and safety/protection angle
- FR-6: Include messaging about daily automatic sync in hero section
- FR-7: Mention backup/download capability in hero subheadline or features section
- FR-8: Frame backup feature as safety benefit: "if ESP has issues, you have a backup you can download anytime and import elsewhere"
- FR-9: Update pricing section CTA button to remove "Start your free trial" text
- FR-10: Add copy emphasizing affordability and accessibility in pricing section
- FR-11: Update FAQ section to remove free trial references
- FR-12: Add FAQ question and answer about backup/download feature
- FR-13: Ensure all copy maintains balanced tone: professional, friendly, and security-focused
- FR-14: Update hero features row to emphasize daily sync frequency
- FR-15: Add backup/download to benefits/features list (not as primary hero feature)

## Non-Goals (Out of Scope)

- No changes to navigation or footer
- No changes to screenshot/visual mockup in hero section
- No changes to pricing structure or calculation logic
- No changes to backend billing or subscription functionality
- No changes to authentication or signup flow
- No new visual components or design system changes
- No A/B testing or analytics implementation
- No changes to other pages (dashboard, settings, etc.)

## Design Considerations

- Maintain existing visual design and component structure
- Keep existing color scheme and styling
- Preserve existing animations and transitions
- Update text content only, no layout changes
- Ensure new copy fits within existing text containers
- Maintain responsive design behavior
- Keep existing icon usage consistent

## Technical Considerations

- All changes are copy/text updates in `apps/frontend/src/app/page.tsx`
- No new components or dependencies required
- No API changes needed
- No database changes needed
- Changes are frontend-only, no backend impact
- Ensure all text updates are properly escaped for React
- Maintain TypeScript type safety
- Follow existing code formatting and linting rules

## Success Metrics

- All free trial references removed from homepage
- Credit card requirement clearly communicated
- Exact pricing ($5/month) prominently displayed
- Audience safety angle clearly communicated in hero section
- Daily sync messaging visible and clear
- Backup/download feature mentioned in benefits
- FAQ section accurately reflects pricing model
- No broken links or missing text
- Homepage loads without errors
- All acceptance criteria verified in browser

## Open Questions

- Should pricing be shown in hero section or only in pricing section? (Current: only in pricing section)
- What exact wording should be used for credit card requirement? (e.g., "Credit card required", "Credit card required to start", "Start with credit card")
- Should we add a dedicated "Safety & Security" section, or keep backup feature in existing sections?
- What specific copy should emphasize "super cheap" pricing while maintaining professional tone?
- Should we add a comparison or testimonial section emphasizing audience value?
