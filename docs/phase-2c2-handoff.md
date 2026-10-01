# Phase 2C-2 handoff

Superseded for ongoing work by [Phase 2D handoff](phase-2d-handoff.md); this records the prior workflow milestone.

Implemented 2026-10-01. Shared demo admin workflows only. Stop before real integrations or further features. All remaining client-approved scope stays in `docs/build-checklist.md`.

## Behavior

- `/demo/admin` now uses the application/member React session. Four fictional examples include approved-active, approved-inactive, pending and rejected records; a submitted application appears immediately. Search matches business/applicant/email/city; status and suspension filters combine, with counts, clear filters and empty states.
- Review details show the application fields. Approve/reject and suspend/reinstate require a 3–300 character fictional reason. Reasons are explicitly applicant-facing and appear in member status (application confirmations also show the current approval decision). There are no private admin-note fields or notifications.
- Rejection, suspension and verification removal use native confirmation dialogs identifying the business/claim. Cancellation changes nothing. Actions never change subscriptions. Reinstatement and approval still require active subscription and no suspension for eligibility; approval does not clear an existing suspension.
- Credentials have canonical `{ id, text, verification }` objects on each session record. Forms derive text from those objects. Exact unchanged claims preserve IDs/decisions across reordering; new, changed, removed-then-re-added or additional duplicate claims receive new IDs and start unverified. Verification is a fictional admin decision only; the platform does not issue certifications.
- Category display names can be renamed in the session (3–80 characters; trim/space normalization; equivalent case/punctuation/Unicode-compatibility labels rejected). IDs, associations, prices and billing keys are unchanged. Application, member, admin and session directory views use the same labels. Imported catalog constants and the public directory are untouched.
- The admin session directory applies approved + active subscription + not suspended before explicit public projection. It shares presentation with the member preview. Application contact name/email, decision reasons, subscriptions and other protected state are excluded. Member previews can show their own ineligible content without publishing it.

## State and boundaries

`src/domain/demo-member.ts` extends the existing reducer; `src/validation/admin.ts` validates reasons and names. Member edits remain an explicit allowlist and cannot change decisions, subscription, suspension, featured entitlement or record identity. Canonical credentials replace the old separate listed/verified copies. The independent server dashboard roster/contract/DTO are removed.

One tab's React memory is the only mutable shared store. Client-side navigation preserves it. Refresh, full-page navigation (including native directory search), closing the tab, or reset clears records, category labels and credential decisions together. Unsubmitted form drafts are not retained. Demo pages are not authentication or authorization.

No localStorage/sessionStorage, network mutations, logging of form contents, server actions, persistence, uploads, email, payments or real services. Forms and action controls are disabled before hydration and without JavaScript. The admin streaming loading boundary was removed so no-JavaScript visitors see the explanation and disabled controls. All demo no-index conventions remain.

## Checkpoint and checks

Git was checked before editing. Identity remains unset; no identity was invented or commit created. Saved the existing source-tree checkpoint at `refs/checkpoints/pre-phase-2c2` (`d9a035ce91352ad2180abae0158f79b46c794d4b`). Existing work and private-source/secret/generated-file ignores were preserved. No remote/push/deployment.

Verification results are recorded in the Phase 2C-2 section of `docs/build-checklist.md`. Screenshots are in `output/playwright`, including `admin-session-*` at desktop/tablet/mobile sizes. Tests cover decisions across application/admin/member navigation, subscription independence, suspension, protected edits, credential identity/revocation, category invariants, public boundaries, reset and no submission/storage effects.

Typecheck, zero-warning lint, 33 unit tests and the demo build passed. The build used the prior process-only 768 MB Node heap cap; no project setting changed. The default production build correctly rejects missing demo opt-in. Desktop/tablet/mobile layouts were visually reviewed with no overflow or detected axe violations. Code review confirmed explicit field allowlists, no competing stores, no submission/storage/logging calls and no added dependencies.

The complete `npm run test:e2e -- --workers=1` run passed 56 cases with one intentional desktop-menu skip (4.6 minutes). This includes the new admin journeys and all earlier search, profile, inquiry and member regressions. No page errors, network mutations or browser storage were detected in the new journeys. Chromium emulation is the tested browser scope.

## Limitations and remaining work

- No actual review, verification, publication, notification or billing occurs. Seeded inquiries remain independent from public inquiry forms. Subscriptions are read-only examples; no payment-status controls exist.
- Category labels are demo-only and reset; server public pages intentionally keep their canonical labels/data. A session-only directory preview has no public profile routes.
- Chromium emulation and automated axe checks supplement keyboard/visual review; physical devices, Safari/Firefox and a complete accessibility audit remain unverified.
- User review is required before real integrations. Remaining scope includes authenticated ownership/admin access, database/RLS/storage, audit trails, payments/subscriptions, notification delivery, featured listings, reviews, Q&A, consultations, resources/certification links, CMS/newsletter/About Us, launch and client handoff. Unresolved pricing/business rules still need confirmation. No next-phase work was started.
