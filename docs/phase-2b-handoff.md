# Phase 2B handoff

Current work continues in [Phase 2C-1 handoff](phase-2c1-handoff.md); profile/inquiry behavior below remains unchanged.

Implemented 2026-10-01. Scope: demo professional profiles and inquiries. Stop before Phase 2C member/admin workflows or integrations. The authoritative overview/alignment and existing design still apply.

## Behavior and boundaries

- Stable `/professionals/[id]` routes link from directory cards using existing immutable IDs. All eight categories use their catalog labels, business specialties and services.
- Profiles show business description, location/service area, services, public contact details and credentials, with missing-content fallbacks. One fixture has `.invalid` sample contact details; contacts are plain text, not live channels. Two fixtures have explicit sample service areas; a city or search radius never implies coverage.
- `getPublicProfile` applies approved + active + not suspended before explicit public projection. Private account email, billing, application and moderation fields are never projected. Nested contact values are individually allowlisted. Page and metadata share a request-scoped lookup; missing/ineligible IDs get the same not-found experience without revealing status.
- Loading boundaries are scoped to directory/member/admin routes so profile eligibility resolves before response streaming and unavailable direct profiles can return HTTP 404.
- Listed/unverified credentials and fictional verified examples are distinct. The platform does not issue certifications. No reviews, ratings or review structured data were added; these remain in the backlog. Existing noindex/nofollow metadata and headers apply.
- `returnTo` accepts only `/directory` with valid Phase 2A parameters, canonicalized by shared validation. External URLs, other paths, fragments, duplicate known keys and malformed queries fall back to `/directory`. Normal directory pagination and filters survive profile navigation and reload.
- The inquiry client island validates name (1–80 trimmed nonempty characters, raw maximum 80), email (nonempty, basic address syntax, maximum 254) and message (10 trimmed characters minimum, raw maximum 2,000). Fixed field errors use labels, ARIA associations and focus on the first invalid field. Values are never echoed into confirmation or logs.
- Before submission the form requests sample information only, explains that nothing is sent or saved, and discourages medical histories/sensitive details. Valid submission clears entries and focuses a truthful demo confirmation; reset opens a blank form. No endpoint, server action, network submission, storage or email exists. With JavaScript unavailable the fields are disabled and an explanation is shown; profile reading/navigation still works.

## Verification

Passed: typecheck, zero-warning lint, 22 unit tests and optimized demo build. All 38 applicable browser cases passed across the final full run plus a targeted rerun: the full run passed 36 with one intentional desktop menu skip; two mobile resource-related failures passed with `--last-failed --workers=1`. Profile not-found checks confirm HTTP 404. Axe checks found no violations, and desktop/tablet/mobile screenshots were inspected in `output/playwright`.

Tests cover profile eligibility for every fixture, nested projection, category-independent IDs, inquiry boundary/type validation, safe return URLs, all eight public routes, metadata/privacy, no-JavaScript behavior and the filtered search → profile → inquiry/reset → results journey. Detailed executed results and limitations are recorded in `docs/build-checklist.md`.

Ordinary `npm run build` correctly rejects missing demo opt-in; production remains blocked.

## Limitations and next work

- Synthetic, immutable data only. No real contact or credential verification. Inquiry confirmation is a local demonstration and disappears on reload; no inbox exists.
- Chromium emulation covers desktop/tablet/mobile; physical devices and Safari/Firefox remain unverified. Automated axe checks do not replace a complete accessibility audit.
- Phase 2C: demo member application/profile/inquiry workflows and admin review/category/credential workflows, followed by user review before real integrations.
- Later: real auth/ownership/RLS, persistence, safe uploads, inquiry delivery/moderation, subscriptions, featured listings, reviews, Q&A, consultations, external education/certification resources, content/newsletter/About Us and launch work remain in the checklist. Renew integration security tests when services connect.

No deployment or next-phase implementation. Preview with `npm run build:demo` and `npm run preview`.
