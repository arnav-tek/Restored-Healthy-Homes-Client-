# Phase 2C-1 handoff

Superseded for ongoing work by [Phase 2C-2 handoff](phase-2c2-handoff.md); this document records the earlier milestone.

Implemented 2026-10-01. Public demo applications and member experience only. Stop before Phase 2C-2 admin actions or real integrations. The authoritative overview/alignment and the established visual direction still apply.

## Behavior

- `/list-your-business` is linked by **List Your Business** navigation. It needs no login or dashboard. It collects fictional contact/business details, city/state, stable category IDs, services, description, healthy-home practices and optional listed credentials. Confirmed monthly prices are shown per category; multi-category pricing remains unresolved and is never totaled.
- Shared `parseApplication` validates both application and member edits. Limits: name/city 80, business name 120, email 254, phone 40, website 200, state two letters, description 20–2,000, practices 20–1,500. Services: 1–12 lines, each at most 120 characters (1,500 total). Optional credentials: up to 10 lines, each at most 120 (1,200 total). Optional HTTP(S) websites reject credentials/other schemes. Errors are fixed messages with field associations and first-error focus.
- Valid submission creates one current `demo-local-application`, pending with inactive subscription, no suspension/featured entitlement and no verified credentials. Confirmation says nothing was sent to the owner or published, and links into the same session's member workspace.
- `/demo/member` includes separate pending, approved and rejected fictional records, local permitted-field editing, a public-facing content preview, read-only subscription information and a fictional inbox. Choosing an example selects a record, not a role or review decision. Approval, active subscription and no suspension remain independent eligibility requirements.
- The edit allowlist excludes identity, approval, subscription, suspension, verification decisions and featured entitlement. Submitted credentials are only listed/unverified; existing verification decisions remain separate. Application contact name/email do not appear in the public-facing preview. Sample phone/website values render as text only.
- The inbox is seeded independently; public Phase 2B inquiries are never delivered to it. New applications have an empty inbox. No reply/delivery controls pretend to work. The server directory and existing read-only admin roster are unchanged by local edits.

## State and boundaries

`src/domain/demo-member.ts` owns typed state, actions, allowlist and reducer. `src/validation/application.ts` owns shared external-input validation. The root `DemoSessionProvider` owns the only mutable application/member source of state and preserves accepted submissions/edits across Next Link navigation. Unsubmitted form drafts are not saved across navigation.

State is React memory in one tab only. Refresh, full-document navigation (including native directory search), closing the tab, or **Reset demo session** clears it. A new tab starts independently. No localStorage/sessionStorage, server mutations, endpoints, auth/roles, logging of form contents, database, payments, email or uploads are involved.

`src/data/demo/member-session.ts` is a deliberately client-safe synthetic fixture source, separate from server-only professional/account fixtures. Only fictional workspace DTOs may be added there. Seed data never contains private server records; submitted user values never enter module-level state. Public catalog props explicitly project ID/name/monthly price. Public profile/directory eligibility and allowlists remain intact.

Application/edit/reset/example controls stay disabled until hydration; no-JavaScript visitors see an explanation. Forms use local handlers only and cannot fall back to native submission before hydration. A shared readiness hook also preserves the Phase 2B inquiry guard.

The member route no longer uses a streaming loading boundary, allowing its no-JavaScript explanation and disabled controls to render without client scripts. The obsolete server member-summary getter was removed to keep one member source of truth.

## Git and verification

No Git repository or commit identity existed. Initialized local Git, expanded ignores for private client sources, secrets, generated output and dependencies, and saved a source-tree checkpoint at `refs/checkpoints/pre-phase-2c1` (`cd0b6689c1cd2b03d2cecdf4721a486c96df2c55`). This is a Git tree reference, not a commit. No identity was invented, no remote configured and nothing pushed. The tree can be inspected with `git show refs/checkpoints/pre-phase-2c1:path/to/file`.

Executed check results and rendered review are recorded in `docs/build-checklist.md`. Tests cover validation, state isolation/reset/navigation, protected fields, eligibility and credential rules, seeded inbox separation, no submission/storage side effects, JavaScript-disabled controls and keyboard/responsive journeys. Screenshots: `output/playwright`.

Passed: typecheck, zero-warning lint, 27 unit tests and demo build. A rebuild hit a host Node out-of-memory error; retrying with `NODE_OPTIONS=--max-old-space-size=768` passed without changing project settings. The full single-worker browser run passed 44 cases with one intentional skip and caught three no-JavaScript loading failures. After removing the member loading boundary, all 12 targeted member/layout cases passed: all 47 applicable cases are verified across the runs. Desktop/tablet/mobile application, validation, confirmation and member layouts were inspected; axe found no violations. Review confirmed one shared form/validator/state source, explicit editable fields, no private server data in client fixtures, no submission/storage/logging code, and no admin actions.

## Limitations and next work

The default `npm run build` was also checked and correctly rejects missing production opt-in.

- This is a demonstration, not authentication or an application processing service. Refresh discards all local work. No server public listing is published or updated, even for an eligible example.
- Chromium emulation only; physical devices/Safari/Firefox remain unverified. Automated axe checks supplement visual/keyboard review, not a full accessibility audit.
- Phase 2C-2: admin review, approval/rejection/suspension, category/credential decisions and coherent demo administration. No admin actions were implemented here.
- Real auth/ownership/RLS, persistence, safe uploads, notifications, payments/subscriptions, featured listings, reviews, Q&A, consultations, resources/certification links, CMS/newsletter/About Us and launch remain in the checklist. Revisit unresolved business rules and renew integration security tests before services connect.

No deployment, integrations or next-phase work. Local preview: `npm run build:demo`, then `npm run preview`.
