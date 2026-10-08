# Phase 2F-3 handoff

Implemented 2026-10-04. Demo sign-in and client walkthrough only. Stop before reviews, integrations, deployment or push.

## Behavior and boundaries

`/login` offers eight public fictional account presets: administrator, Meadow (approved/active), Willow (approved/active), pending, rejected and approved/inactive professionals. Every preset uses the public passcode `home-access`. A ninth `application@example.invalid` preset appears only after a public demo application exists; submission does not create a real account or sign in automatically. Preset descriptions refer to original fixtures; decisions can change during the session.

Shared `DemoSession.identity` stores only an admin/member discriminator, account ID and (for members) stable member ID. Sign-in validates bounded values against available presets and derives identity from that allowlist; it never stores entered credentials. A selected account must sign out before another can be selected. Header actions reflect identity. The provider now also surrounds the header, retaining one session source.

Dashboard shells show neutral prehydration/no-script screens, a signed-out sign-in requirement or a wrong-workspace link to the correct dashboard. These are interface gates, **not authentication, authorization or secure route protection**. Synthetic fixtures remain client-accessible demo data. Member query IDs and admin review links cannot silently select an identity. Member controls use the signed-in stable member; an explicit Switch account action replaces the member picker. Existing eligibility, approval, subscription, credentials, Q&A and consultation rules are unchanged.

`returnTo` accepts only the signed-in account's `/demo/member` or `/demo/admin` path with validated dashboard query fields. External/protocol-relative, malformed, duplicate and unknown query destinations fall back to the account dashboard. Member return URLs cannot select another member. No redirect tokens, credentials or private record contents are generated in URLs.

Sign-out clears identity and every unsaved draft, confirming before discarding drafts. Starting an account also confirms any guest drafts before clearing them. Submitted applications, Q&A, profile changes, consultations, notes and decisions remain available for cross-account walkthroughs. Confirmed global reset clears identity, drafts and workflow records; refresh/full reload recreates the original signed-out session. No localStorage/sessionStorage, cookies, tokens, content logging, credential requests or integration endpoints were added. Production guard and no-index remain.

Public inquiry values remain only in their mounted form. An empty dirty marker supports the sign-out warning without copying inquiry contents into shared state; submission/unmount clears it. Phase 2B inquiries are still never delivered to the sample inbox.

Regression testing also caught a fresh-page search hydration reset that could erase an early category selection. Search now resets restored history/cache state only; native no-JavaScript search and validated URL defaults remain supported.

## Client walkthrough

1. Browse public pages or submit a fictional consultation at `/consultations` without signing in.
2. Open `/admin/login` directly, expand **Quick access**, choose **Administrator**, then Sign in. Open Consultations and assign the request to **Meadow Studio** (use the Healthy Home Designers category).
3. Choose Switch account or Sign out. Expand **Quick access**, select **Meadow Studio**, sign in and open Consultations. Accept the assignment; return to the public Consultations page to see the updated confirmation. No booking, payment or notification occurs.
4. Try pending/rejected/inactive presets to inspect membership states; sign-in does not grant public listing eligibility. Use List Your Business for a fictional application, then its submitted-application preset to preview it. Admin approval alone still leaves its subscription inactive.
5. Try public Q&A submission → admin publication → eligible member answer → admin moderation, signing out/in between accounts. Saved records remain; unsaved drafts do not transfer. Use Reset workspace to start over.

## Verification

- `npm run check` passed: typecheck, lint, **61 unit tests** and the optimized demo build. Builds used a process-only 768 MB Node heap cap; no dependencies or configuration were added.
- **128 applicable browser cases passed** across completed desktop/tablet batches and one full 43-case mobile run. One desktop-only mobile-menu case is intentionally skipped. Initial runs exposed navigation-helper timing assumptions and the search hydration reset; these were corrected and affected/unfinished cases completed. This was not one uninterrupted full-suite run.
- Coverage includes both identity types and every member preset, direct/wrong-workspace visits, safe returns, validation/focus, logout cancellation, draft isolation, reset/refresh/new-tab isolation, application review, Q&A moderation and consultation request → admin assignment → professional acceptance → public confirmation. Tests sign in through the shared UI helper. No-script/prehydration, public projections, native search and mutation/storage/cookie checks pass.
- Actual 1440 px desktop, 768 px tablet and 390 px mobile renders were inspected, including sign-in, validation focus, gates and member/admin screens. Captures are in `output/playwright/phase-2f3-*`. Automated axe and overflow checks pass. Physical devices, Safari/Firefox and a full accessibility audit remain unverified.
- Default `npm run build` correctly fails with the production-blocked message without demo opt-in. Focused review found no credential logging, transmission, persistence or parallel authentication layer; `git diff --check` passed. Injected adapter-error tests produce expected synthetic server errors without submitted content. No deployment or push occurred.

## Remaining work

Real authentication requires server-side sessions, ownership/authorization checks, persistence/RLS and renewed security testing. Public demo credentials must never become production access. Reviews and all integrations remain unstarted. Consultation policies/offer/delivery decisions remain provisional. Fuller homepage, client-supplied About Us story/text/video and all other approved backlog features remain in the checklist.

Website labels and the public access code were revised on 2026-10-08; see [website copy cleanup](normal-website-copy.md). Authentication and session boundaries remain unchanged.

Admin sign-in now has a separate `/admin/login` entry point. Public `/login` shows only professional accounts, and the public footer no longer links to admin access. The existing Other workspace links remain inside walkthrough dashboards for cross-role review. Admin dashboard gates and sign-out return to the admin login. This separation does not add server authentication or authorization.
