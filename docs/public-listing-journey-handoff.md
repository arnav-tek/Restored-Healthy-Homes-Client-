# Public listing journey — 22 October 2026

Scope: a newly submitted fictional application can become a public directory result and full public profile in the same tab. No real accounts, Supabase, storage, payments, email, uploads, deployment or featured-ranking changes.

## Stages

1. **Public rules and projection:** `src/domain/public-application.ts` recognizes only the reserved `demo-local-application` route and selects the accepted application from the existing session. Approval + active membership + no suspension are all required. Explicit allowlists exclude private owner/contact email, review reasons, suspension/scenario notes, billing, entitlement and other private state. Public owner name/email stay opt-in. Cards receive a smaller separate projection. Five focused unit tests cover gates, projection/copy safety, clearing, reset/sign-out, category/return validation, pagination and city matching.
2. **Directory/profile integration:** merge only the eligible application into the existing public search/sort/rating/pagination pipeline. Existing canonical sample listings are preserved. Added categories join the tab's directory filters; canonical public names/prices stay unchanged. A syntactically local category URL selects a view only; the actual tab catalog must validate it. Server canonicalization preserves requested pages so it cannot discard a page containing a tab-only record; the existing hydrated results clamp after merging. City matching ignores case and repeated spaces and uses only existing city-center coordinates, with no new geocoding or invented service area.
3. **Workflow and verification:** admin review/membership and member overview show publication status and public links for the submitted application. Accepted edits update its public result/profile; unsaved drafts do not. Suspension, rejection or non-active membership removes publication. Sign-out keeps accepted records for the same-tab walkthrough. Reset, refresh, a new tab or a full-document navigation cannot restore them. Completed verification is recorded below.

## Public profile boundary

The new route uses the existing themed profile view for business description, services, practices, location/map, public contacts, reviewed versus unverified credentials and the existing inquiry preview. No precise address, service coverage, credential verification, photo or review is invented. Review submission for newly created listings is explicitly unconnected in this phase; canonical profile reviews and other existing workflows retain their current behavior.

The reserved session route returns neutral HTTP 200 HTML with generic no-index metadata. Entered application/profile text is never sent through HTML/RSC/metadata; the client resolves availability from tab memory. Without JavaScript it explains that requirement and provides a directory link. Missing, pending, inactive, rejected, suspended or reset applications show the same unavailable state after hydration. All other unknown/private profile IDs retain real 404s. Private record objects are never passed from the server to client components.

## Walkthrough

1. Submit fictional details through List Your Business. The application starts pending/inactive and cannot be found publicly.
2. Use Administrator Quick access at `/admin/login`. Approve the new business under Applications; approval alone still does not publish it.
3. Under Membership, select that business, choose active, enter a scenario note and confirm. No payment occurs.
4. Follow Find this business in the directory, then View profile. Check the services, practices, optional public identity/contact and unverified credential labels.
5. Edit accepted profile fields or change membership/suspension/rejection to verify visibility transitions. Refresh/reset to clear the walkthrough.

## Verification

- Final `npm run check` passed typecheck, zero-warning lint, all 111 unit tests and the optimized demo build. A build before that exposed a TypeScript issue in the screenshot cleanup helper; the helper was corrected before the final passing check.
- Focused browser stage: all 12 cases passed across 1440px desktop, 768px tablet and 390px mobile, including an additional 320px enlarged-text/long-word render. Tests cover the complete journey, private fields/HTTP, escaped text, eligibility transitions, unsaved versus saved edits, public contact clearing, sign-out, separate-tab isolation, refresh/reset, custom categories, safe returns and no-script/private-ID behavior. Axe and page-overflow assertions pass in captured views. The initial focused run was stopped after finding missing dialog handlers in the new suspension/rejection test; the final run explicitly accepts those confirmations and retains every assertion.
- Fresh directory/profile screenshots at desktop/tablet/mobile and the 320px enlarged-text profile were visually reviewed. They reuse the existing theme and show no presentation issues in the inspected views.
- Full `npm run test:e2e -- --workers=3`, before the final repeated-entry key cleanup: 280 passed, 11 intentional shared/viewport skips, zero failures (291 configured cases). Existing admin/member, search/history/pagination/rating, no-script, media/maps, Q&A, consultation, review and privacy tests passed alongside the new journey. Injected adapter-failure messages are expected fixture diagnostics and contain no entered application content.
- Default `npm run build` without demo opt-in correctly rejected production with exit 1. Fresh test-source TypeScript and focused lint checks also passed.
- Final review identified repeated service/credential text as a valid input edge case. Directory/profile list keys now distinguish repeated entries; the affected browser tests also assert that repeated services remain visible. A fresh `npm run check` passed typecheck, lint, all 111 unit tests and demo build against that final source. All 24 final affected browser cases passed across desktop/tablet/mobile (new journey plus existing public profiles); the final mobile render was reviewed again. Unrelated passing browser cases were not repeated after this small rendering correction. `git diff --check` passes.
- Evidence: `output/public-listing-final-check.log`, `output/public-listing-focused-final.log`, `output/public-listing-full-e2e.log`, `output/public-listing-test-static.log`, `output/public-listing-production-guard.log`, `output/public-listing-completion-check.log`, `output/public-listing-completion-e2e.log` and `output/playwright/public-listing-*`.

Existing quality-audit work was already uncommitted before this phase; it was retained. No commit, push or public deployment is part of this request. Chromium viewport emulation and automated accessibility checks do not replace physical-device testing, a full manual accessibility audit or production authorization tests.

The referenced confidential overview/alignment files and project-local skill directories are absent in this checkout. Available handoffs and local Next.js guides were read; no confidential documents were recreated.
