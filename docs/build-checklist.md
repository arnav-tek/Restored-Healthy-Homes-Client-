# Build milestones and acceptance

The [overview](../Project%20overview/restored-healthy-homes-project-overview.md) and [alignment](../Project%20overview/client-conversation-alignment.md) define final scope. These milestones sequence implementation, not exclusions.

The [source-to-delivery coverage table](scope-coverage.md) maps all overview sections and original-brief requirements to this plan, including superseded instructions and unresolved decisions. Use it to distinguish missing scope from unfinished implementation; do not expand scope from generic recommendations.

## Phase 1 — foundation and preview

- [x] Read three source documents, inspect live visual reference, preserve confidential files.
- [x] Install nine requested skills with supporting files, licenses and pinned provenance.
- [x] Next.js App Router, strict TypeScript, Tailwind and npm lockfile.
- [x] Record design direction before components; responsive public layout and demo dashboard shells.
- [x] Canonical categories/prices; independent stable IDs and billing mappings.
- [x] Shared typed repositories and synthetic records for all categories and varied states.
- [x] Central eligibility and explicit public field projection.
- [x] Category filtering, disclosures, empty/error/loading/not-found states.
- [x] No persistent state or external side effects. Live mode fails closed.
- [x] Final verification results recorded below.
- [x] User authorized Phase 2A on 2026-09-30, extending the existing design.

## Phase 2A — demo search and directory

- [x] Homepage city/ZIP and canonical-category search.
- [x] Validated URL keyword/category/location/radius/sort/page, history/reload and filter-page reset.
- [x] Replaceable demo location adapter, approximate distances, explicit unsupported/ambiguous handling.
- [x] Eligibility before filtering/counting/paging; public-only output; no external services.
- [x] Counts, pagination, clear filters, accessible errors/empty states and honest service previews.
- [x] Final required checks and visual review (results below).
- [x] Concise [Phase 2A handoff](phase-2a-handoff.md).
- [x] Pre-2B follow-up: explicit fixture category IDs and catalog-reordering regression; corrected demo-first sequencing. Typecheck, lint, 18 unit tests, demo build and 26 browser tests pass (one intentional skip).

## Phase 2B — demo profiles and inquiries

- [x] Add individual demo profiles and working profile navigation with public eligibility and field allowlists.
- [x] Add demo inquiry submission, validation and confirmation states using synthetic data; no real email or delivery.
- [ ] Refine homepage following review and agreed category views; retain shared contracts and honest loading/empty/error states.
- [x] Responsive/accessibility/browser verification; results recorded below.
- [x] User authorized Phase 2C-1 public application/member demo; admin actions remain deferred.
- [x] Concise [Phase 2B handoff](phase-2b-handoff.md); stop before Phase 2C.

## Phase 2C-1 — public application and demo member experience

- [x] Public List Your Business application, canonical categories/prices, shared typed validation and pending demo confirmation.
- [x] Shared React session for application/member edits, example selection and explicit reset; refresh clears local state.
- [x] Pending/approved/rejected examples, permitted-field editing, honest public-facing preview, read-only sample subscriptions and separately seeded inquiry inbox.
- [x] Protected status/identity/verification fields are excluded from member edits; submitted credentials remain unverified.
- [x] Final verification and rendered review, recorded below.
- [x] Concise [Phase 2C-1 handoff](phase-2c1-handoff.md).

## Phase 2C-2 — demo admin workflows, before real integrations

- [x] Shared demo admin application review, approval/rejection/suspension/reinstatement, category labels and credential review; retired the independent roster.
- [x] Stable claim identity; edited/new credentials require review. Session labels preserve category IDs, prices, billing keys and associations.
- [x] Approved-active/inactive examples and explicit public projection for an eligibility-filtered session directory preview; real public directory unchanged.
- [x] Verify eligibility, public-field boundaries and useful success/error states; no browser role switches, real auth, uploads, payments or email.
- [x] Responsive/keyboard/no-JavaScript journeys and rendered review; [Phase 2C-2 handoff](phase-2c2-handoff.md).
- [ ] User review of demo workflows before starting real integrations.

## Phase 2D — focused member and admin dashboards

- [x] Member overview/profile/inquiries/membership and admin overview/applications/listings/credentials/categories.
- [x] Validated URL sections, filters and record/category selections; client navigation and browser history.
- [x] Persistent desktop rail, native mobile menu, compact state summaries, scoped tables and focused forms.
- [x] In-memory drafts survive section/record changes; shared reset requires confirmation and clears drafts.
- [x] Reuse existing decision/credential/category rules, shared session and public projections; no integrations or later features.
- [x] Final checks, rendered review and [Phase 2D handoff](phase-2d-handoff.md).

## Phase 2E-1 — public demo Q&A

- [x] Public navigation, published-only list/detail pages, keyword/category filters, URL state and pagination.
- [x] Stable IDs, safe results returns, eligibility-aware professional links and explicit public projections.
- [x] Validated question form, pending session submissions, truthful confirmation and shared drafts/reset.
- [x] Server-only unpublished seeds; no contact collection, side effects, publication or moderation controls.
- [x] Final checks, rendered review and [Phase 2E-1 handoff](phase-2e1-handoff.md).

## Phase 2E-2 — demo answers and moderation

- [x] Provisional centralized approved/active/unsuspended answer policy; selected-author pending submissions, isolated drafts and own-answer history.
- [x] Separate admin question/answer queues, publication/rejection with confirmation before hiding published content, private notes and independent parent/answer statuses.
- [x] Public seed/session overlay with explicit allowlists, same-session search/counts/pages/details and neutral prehydration routes; private server fixtures remain server-only.
- [x] Shared member/admin/public journeys, moderation/privacy boundaries, responsive regression checks and [Phase 2E-2 handoff](phase-2e2-handoff.md).

## Phase 2F-1 — public demo consultation requests

- [x] Public consultation page, proposed offer, intended workflow and truthful demo limitations.
- [x] Fictional request form with shared validation, stable category IDs, inline errors and first-error focus.
- [x] Shared tab-session records/drafts, forced requested/not-collected state, configuration-owned offer, unassigned/unscheduled defaults and duplicate-submit guard.
- [x] Focused confirmation, deliberate additional requests, navigation preservation and global reset/refresh clearing.
- [x] Discoverable navigation and one modest homepage teaser; full homepage and About Us work remain below.
- [x] Final browser/responsive verification and [Phase 2F-1 handoff](phase-2f1-handoff.md).

## Phase 2F-2 — demo consultation management

- [x] Shared session consultation queue, URL filters/details and bounded admin-only note drafts.
- [x] Centralized provisional assignment, ownership and transition rules; confirmations for cancellation and accepted assignment changes.
- [x] Member assignments, acceptance/decline, eligibility attention and explicit contact-free projection.
- [x] Live safe public status summaries, original offer snapshots and independent not-collected payment state.
- [x] One additional fictional eligible designer for reassignment; existing stable IDs retained.
- [x] Final regression/rendered verification and [Phase 2F-2 handoff](phase-2f2-handoff.md).

## Phase 2F-3 — demo sign-in and client walkthrough

Added at the user's request before reviews. This previews the account journey; it does not implement real authentication or make demo dashboards secure.

- [x] Shared styled sign-in page with explicitly fictional member/admin accounts, accessible validation and clear demo-only copy; no real credentials, account creation or password-reset delivery.
- [x] React-memory demo identity and workspace navigation gates; signed-out and wrong-workspace journeys, safe allowlisted return links, neutral prehydration/no-script states.
- [x] Header sign-in/dashboard/sign-out actions; public browsing and List Your Business remain available without login. Pending/rejected/inactive members can preview their own status without gaining listing eligibility.
- [x] Sign-out clears identity and form drafts while retaining shared synthetic workflow records for same-tab client demonstrations; warn before discarding unsaved drafts. Confirmed global reset clears identity, drafts and demo records. Refresh/full reload clears session state.
- [x] Explicit demo-account switching via sign-out/sign-in, with no silent identity changes from dashboard links or member-example controls; stable member IDs and existing domain rules retained.
- [x] Reuse current provider/reducer, projections and design system; no browser storage, real API integration, external side effects or production-guard weakening.
- [x] Verify login/logout/direct links/role mismatch, safe returns, draft isolation, shared admin-to-member consultation/Q&A journeys and existing regressions; review desktop/tablet/mobile renders.
- [x] Concise [Phase 2F-3 handoff and client walkthrough](phase-2f3-handoff.md); 61 unit tests and all 128 applicable browser cases passed across completed runs, plus typecheck/lint/demo build and production guard. One intentional desktop-menu skip. Stop before reviews or integrations.

## Phase 2G-1 — public demo reviews and ratings

- [x] Typed review contract, stable IDs, explicit public projection and server-only unpublished seeds; reuse directory eligibility.
- [x] Published-only profile reviews and shared averages/counts, honest zero-review state and bounded same-profile pagination. Directory sorting/filters unchanged.
- [x] Fictional guest review form with bounded validation, accessible errors/focus and disabled no-script/prehydration controls; no contact collection or verification claims.
- [x] Profile-scoped session drafts, forced-pending submissions, repeated-attempt guard, sign-out isolation and global reset/refresh behavior; no storage or submission requests.
- [x] Required checks and actual desktop/tablet/mobile renders: 67 unit tests, all 140 applicable browser cases across completed runs (one intentional desktop-menu skip), typecheck/lint/demo build and production guard. See [Phase 2G-1 handoff](phase-2g1-handoff.md) for boundaries, test fixes and remaining decisions.

## Phase 2G-2 — demo review moderation and member visibility

- [x] Explicit stable member/professional associations, two matching fictional account presets and helpful unlinked/empty states; existing accounts preserved.
- [x] Shared review snapshot/decision overlay, guarded transitions and deterministic republication; immutable submitted content and private notes excluded from public/member projections.
- [x] Admin Reviews queue/detail, validated status/professional URL filters, isolated note drafts and confirmation before removing published reviews.
- [x] Same-tab public/member published reviews and derived ratings, current visitor confirmation status, pagination clamping and accessible decorative stars; SSR/no-script seeds preserved.
- [x] Existing draft/sign-out/reset/refresh rules reused with no storage or submission side effects. Directory sorting and unrelated workflows unchanged.
- [x] Required checks and actual desktop/tablet/mobile renders: 74 unit tests, all 152 applicable browser cases across completed runs (one intentional desktop-menu skip), typecheck/lint/demo build and production guard. See the [Phase 2G-2 handoff](phase-2g2-handoff.md) for results, walkthrough and limitations.

Review verification, duplicates/abuse, disputes and removal policies remain unresolved. No replies/editing, production review integration or later-phase work is included. Remaining public pages, fuller homepage and client-supplied About Us story/text/video remain in scope below. Real accounts remain Phase 3.

## Phase 2H-1 — homepage and About Us

- [x] Complete search-led homepage: eight catalog-driven category links, visitor journey, Q&A/consultation/application introductions and About Us link.
- [x] Clearly labeled demo statistics from eligible public listings and individual published review ratings; existing session moderation drives the rating and SSR seeds remain readable.
- [x] Dedicated `/about` layout, typed replacement content and an honest static video placeholder; desktop/mobile header and footer navigation.
- [ ] Final client company story, personal “Why,” approved copy, video, captions and transcript. Layout completion does not approve placeholder content.
- [x] Typecheck/lint, 78 unit tests, demo build and production guard; 92 affected browser cases passed across completed runs (one intentional skip), with desktop/tablet/mobile and intermediate navigation renders reviewed. See [Phase 2H-1 handoff](phase-2h1-handoff.md) for scope, a test scrolling fix and outstanding assets.
- [x] Separate 2026-10-06 visual refinement: search before secondary actions, catalog icon grid, compact statistics/disclosure, connected steps, asymmetric Q&A/consultation features, editorial About introduction, dedicated business closing CTA, composed About story/video/purpose/closing and grouped footer. Functional rules and public data boundaries preserved.
- [x] Actual before/after home/About captures at 1440/768/390 px, 1280/1279 px navigation, 320 px and 200% text reflow reviewed. Mobile Search now ends at y=568 in a 390 × 844 initial viewport (previously y=1,051); no fixed hero height or clipped content.
- [ ] Visual client/user approval of the refined presentation. Final copy and media remain outstanding; implementation and internal visual review are not approval.

Stop before 2H-2. Education, resources/blog, newsletter, featured listings, search refinements and integrations remain outside this phase.

### Phase 2H-1 visual-refinement verification — 2026-10-06

| Check | Actual result |
| --- | --- |
| Typecheck / lint | `npm run typecheck` and zero-warning `npm run lint` passed; final changed tests also passed ESLint and `tsc --noEmit` |
| Unit tests | `npm test`: 78 passed; domain/state calculations unchanged |
| Demo build | Passed, including final shared-style rebuild; process-only 768 MB heap cap |
| Production guard | Ordinary build correctly rejected missing demo opt-in; existing `.env.local` was safely restored after the check |
| Focused browser suite | 72 passed, three intentional viewport skips, 4.1 minutes; `home-about`, `search`, `preview`, `profiles`, `demo-sign-in`, `consultations` across desktop/tablet/mobile |
| Final affected-layout rerun | 24 passed, three intentional skips, 2.6 minutes; `home-about` and `preview` after final logo/footer adjustments |
| Behavior | All eight category destinations, city/ZIP/category search, no-script behavior, About navigation, live publish/reject rating updates, identity navigation and shared directory/profile/dashboard/consultation regressions passed |
| Rendering/accessibility | Actual 1440/768/390 px home/About before/after captures reviewed; signed-in/out 1280/1279 px navigation, 320 px and doubled-text reflow checked; short-screen menu/touch targets, focus, axe and overflow checks passed; no tested normal-page browser errors |
| Code/scope | Static sections remain server-rendered; no new state, domain/rule/repository changes, catalog duplication, packages or media; public projections and production guard preserved; `git diff --check` passed |

The initial focused attempt found a test selector using the replaced consultation headline. Updated that selector and the renamed secondary browse-link selector, retaining behavioral assertions. Actual captures and geometry are in `output/playwright/phase-2h1-refinement-*`; the [handoff](phase-2h1-handoff.md) records composition, pixel measurements and limits. Previews were stopped before builds. This is focused coverage, not a new uninterrupted full-repository browser run. Three skips are the existing desktop mobile-menu case and two duplicate narrow/text checks that run once with explicit viewport changes. Text enlargement is a 200% computed-font simulation; physical devices, Safari/Firefox, a complete accessibility audit and actual approved-video playback/captions/transcript remain unverified. Final story/Why/copy/media and visual client/user approval remain pending. No Phase 2H-2, integrations, push or deployment.

## Phase 2H-2 — Education and Membership Pricing

- [x] Server-rendered education page: all eight stable catalog IDs, browsable native disclosures, introductions, provider options/links, steps, explicit pending timelines/costs and application CTAs.
- [x] Distinguish training certificates, professional certifications and local licenses; platform does not certify. Official references recorded in the [handoff](phase-2h2-handoff.md); final provider/program selection and client content approval remain pending.
- [x] Frontend membership comparison uses catalog names/monthly USD prices, working application links, eligibility guidance and separate education fees. No combined-category totals or checkout.
- [x] Header/footer links, preserved homepage/About design and signed-in navigation; compact menu through 1359px.
- [x] Typecheck/lint, 81 unit tests, demo build and production guard; all 70 distinct applicable affected browser cases verified across the broader run and corrected targeted rerun. Desktop/tablet/mobile, 320px, menu boundaries and accessibility captures reviewed; actual results/limits in the handoff.
- [ ] Client approval of education/provider content, program-specific typical timelines and cost information.

Stop after 2H-2. Remaining demo milestones and integrations require a separate scoped instruction.

## Phase 2I-1 — directory state and rating discovery

Authorized 2026-10-07 after the user deferred blog/resources and newsletter work for now. Those features remain in final scope.

- [x] State and minimum published-rating filters compose with keyword/category/city/ZIP/radius/sort; bounded URL validation, history/reload, clear filters and safe profile return links.
- [x] Public cards reuse the profile review average/count calculation and decorative stars; unrated listings stay visible with Any rating and are excluded from minimum-rating searches.
- [x] Same-tab published review moderation drives cards, filtering, totals and pagination; server-rendered seeds and native no-JavaScript search retained.
- [x] Final required checks and desktop/tablet/mobile render review; actual results and limitations recorded in the [Phase 2I-1 handoff](phase-2i1-handoff.md).
- [x] 2026-10-08 audit corrections: remove the deferred newsletter's false signup and generic social links; make top sorting work before hydration and without scripts. Focused verification is recorded in the handoff.

Real location services, durable reviews and featured priority remain future work. This milestone adds no services or production authorization.

## Scope audit — remaining details to preserve

Reconciled 2026-10-04 against the original Word brief, supplied overview/paste and later client conversation. These unchecked items clarify remaining acceptance, not newly completed work. Later client confirmations override old exclusions, category labels, Netlify hosting and exact-design mandates. Demo completion is not production completion.

- [x] Phase 2H-1 homepage layout: fuller introduction, eight category browse links and statistics derived from eligible public professionals, listing-location states and individual published ratings. Values explicitly describe demo data, not service coverage or live traction.
- [ ] Remaining public-page delivery: final About Us story/Why/text/client video, approved education content, blog/resources, newsletter form and relevant navigation/footer links. About Us layout is built in 2H-1; education/pricing layout and navigation in 2H-2. Final assets and client approval remain outstanding.
- [x] Education layout acceptance in 2H-2: all eight current categories, external certification/training options, explicit pending typical timelines/costs, official provider links and an application CTA. Final program details/content approval remain separately pending. The platform does not certify.
- [x] Demo search completion in 2I-1: state and minimum-rating filters alongside existing city/ZIP/category/radius search, with published review averages/counts on directory cards.
- [ ] Production search and placement: real location/service-area data and agreed featured priority. Radius/service-area/geolocation behavior remains a client decision; an interactive map is not automatically required.
- [ ] Profile/media completion (Phase 3): photo/logo management and secure uploads, intended public professional/owner display name, contact options and badge presentation. Keep public display fields separate from private application contact identity; confirm which names/contact details may be public.
- [ ] Admin completion (Phase 3/5): permitted listing/profile edits, not only status decisions; basic analytics including active members, members by category, new applications this month and membership status. Current demo queue counts alone do not satisfy these analytics.
- [ ] Category architecture (Phase 3): support adding categories without rebuilding and preserve stable IDs on rename. Existing label editing is not evidence of category creation or a billing-configuration editor; define any added admin controls before implementing them.
- [ ] Email acceptance (Phase 4/5): new-application owner alert, approval/rejection notices, relevant-category Q&A alerts, consultation assignment/request alerts, inquiry delivery and agreed account/subscription notifications.
- [ ] Content management (Phase 5): owner can manage blog/resources and certification content without code. Place supplied legal asterisks/disclaimers and Privacy/Terms content as agreed; legal-copy self-service editing remains undecided.
- [ ] Consultation acceptance (Phase 5): connect requests to the agreed payment, scheduling, specialist notification and delivery flow; resolve phone/video, written summary, refund/no-show and money-routing responsibilities. Current assignment/acceptance demo is not a completed booking service.
- [ ] Launch acceptance (Phase 6): confirm custom-domain access for restoredhealthyhomes.com, HTTPS and owner access/handoff. Reconcile the original brief's latest-two-version Chrome/Safari/Firefox/Edge coverage and under-three-second mobile target with the client's permission to revise technical recommendations; record agreed test conditions and measured results, not an assumed guarantee.

Second-pass clarifications from the same sources (not additional product scope):

- [x] Review presentation: Phase 2G-2 shares numeric labels and decorative stars across public/member reviews and admin detail/queue views; stars do not duplicate screen-reader announcements.
- [x] Phase 2I-1 rating filters and directory-card summaries reuse the profile published-review summary, including same-tab moderation; homepage statistics retain the existing published calculation.
- [ ] Q&A attribution: published member answers link to the correct eligible public professional profile through an explicit stable member-to-professional association. Current session-member attribution has no public profile link. Confirm what "verified member" means and category-based notification eligibility; paid membership is not automatically credential verification.
- [ ] Certification badges: derive displayed badges from stored credential data under agreed verification rules, update/remove them when underlying credentials change, and distinguish submitted claims from verified credentials. Existing text/verification previews do not complete automatic badge behavior.
- [ ] Production data continuity: member edits, admin decisions, inquiries, Q&A, reviews and subscriptions operate on shared durable records. Verify changes across independent member/admin/visitor sessions and reloads; the current separate server directory/member demo fixtures and same-tab overlays are temporary.
- [ ] Billing acceptance: customer payment-method updates, cancellation and failed/inactive-payment visibility follow agreed lifecycle rules. Restored payment cannot override rejection/suspension, and admin approval alone cannot bypass the subscription requirement. Featured purchases likewise cannot make an otherwise ineligible listing public.

After Phase 2H-2, await scoped prompts for the remaining demo milestones above; they must not be silently postponed until after launch. Featured placement, production reviews, newsletter, blog/resources, badges and final About Us content remain part of the accepted final delivery. Referral benefits remain excluded.

## Phase 3 — real accounts and administration integrations

- [ ] Supabase schema/migrations, Auth/Storage, server authorization, RLS/grants and ownership tests.
- [ ] Applications, approval/rejection/suspension, profile editing and safe uploads.
- [ ] Member/admin portals, category renaming, credential review/badges, audit trails.
- [ ] Notifications once email integration is ready; real role/tenant isolation checks and review.
- [ ] Extend search to real location/service-area data and durable review ratings when relevant data/decisions are ready. Demo state/rating controls are complete in 2I-1.

## Phase 4 — memberships, featured listings and email

- [ ] Resolve combined billing/lifecycle rules, then Stripe memberships and customer billing management.
- [ ] Verified/idempotent webhooks, reconciliation, state matrix including suspension.
- [ ] Featured upgrade rules, entitlement/priority placement, notifications.
- [ ] Email templates, provider integration, delivery/error behavior, public-form abuse controls.
- [ ] Test-mode walkthrough; no real payments without launch authorization.

## Phase 5 — community, consultations and content

- [ ] Real inquiry persistence/delivery, questions/answers, category matching, alerts and moderation (demo inquiries: 2B; public demo Q&A: 2E-1; demo answers/moderation: 2E-2).
- [ ] Reviews/ratings with agreed verification/moderation.
- [ ] Real paid consultations after routing/matching/scheduling/refund/delivery decisions (public request demo: 2F-1; member/admin demo coordination: 2F-2); commercial terms remain in the private authoritative scope.
- [ ] External certification/education resources, blog/resources CMS, newsletter consent/signup.
- [ ] Remaining public pages: dedicated About Us page with the client's company story, the "Why" behind Restored Healthy Homes, supporting client-supplied text, and their professionally produced video. Match the approved site design across desktop/tablet/mobile and provide accessible video controls and captions/transcript support. Clearly labeled placeholders may be used until final copy/video arrives; do not invent the company story or mark final content complete before client review. Video production is supplied by the client.
- [ ] Agreed client legal-copy placement.
- [ ] Member/admin tools for all included workflows; end-to-end tests and client review.

## Phase 6 — launch and handoff

- [ ] Security re-review; real auth/RLS/storage/payment tests; backups, monitoring and recovery.
- [ ] Physical devices and supported-browser checks, measured performance, HTTPS, SEO, final copy.
- [ ] Client final review and agreed revisions; no assumed unlimited revisions.
- [ ] Owner walkthrough and written admin guide covering applications/listings, memberships, moderation, consultations, credentials and content.
- [ ] Client-owned accounts, verified operating costs and launch authorization; accepted Vercel hosting.
- [ ] Agree expanded delivery schedule and post-launch support terms.

## Phase 1 verification record

Executed on 2026-09-30 with no Supabase, Stripe or email credentials:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass, strict TypeScript and Next route types |
| `npm run lint` | Pass, zero warnings |
| `npm test` | 9 pass; includes 36 approval/subscription/suspension combinations, exact categories/prices, rename safety, multi-category associations, field allowlist and fail-closed config |
| `npm run build:demo` | Pass, optimized Next.js build; four implemented routes |
| `npm run test:e2e` | 14 pass, 1 intentional skip (mobile menu on desktop) |
| Accessibility | axe WCAG 2 A/AA and 2.1 AA checks: zero detected violations on home/directory/member/admin at each of three widths |
| Visual review | All 12 route/viewport screenshots inspected; 390 px mobile, 768 px tablet, 1440 px desktop |
| Navigation/filtering | Eight category choices, URL/back navigation, clear filter, disclosure, workspace links, mobile touch/keyboard/Escape/focus return pass |
| Errors and privacy | Invalid category reset and injected adapter failure pass; public HTML excludes unpublished names and private account/billing markers |
| Runtime | No browser page errors in route checks; no external-service credentials required |
| `npm audit --audit-level=low` | Zero reported vulnerabilities |
| `npm ls --depth=0` | Dependencies resolve |
| Ordinary `npm run build` | Expected rejection: production blocked without explicit demo mode |

Review fixes: narrowed an ambiguous error-test alert locator to main content; contained the mobile admin table with `min-width: 0`; strengthened overflow assertions to use the configured viewport instead of mobile Chromium's expandable innerWidth. Final screenshots confirm the table scrolls within its region and the page stays at 390 px. These fixes were included in the successful final build/browser run.

Web Design Guidelines review: labeled native controls, semantic links/buttons/details/table, visible focus, skip link, reduced-motion support, URL filter state, explicit demo labels and no dead action links. No remaining actionable issue identified within Phase 1. Admin table deliberately scrolls horizontally on narrow screens.

Limitations: Chromium emulation only; physical-device and Safari/Firefox checks remain for later delivery. Automated accessibility checks are not a complete audit. Next lint plugins currently require ESLint 9; the pinned compatible release has an upstream deprecation notice. ESLint 10 was checked, found incompatible, and not retained. Security review is repository-based, not a penetration test. A successful demo production build does not imply production readiness.

## Phase 2A verification record

Executed 2026-09-30, demo fixtures only:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass, strict TypeScript and Next route types |
| `npm run lint` | Pass, zero warnings |
| `npm test` | 17 pass, including eligibility before filtering/counting/pagination, public projection, query bounds, ambiguous/unsupported locations, radius boundaries and coordinate edge cases |
| `npm run build:demo` | Pass, optimized build |
| `npm run test:e2e` | 26 pass, 1 intentional skip (mobile menu on desktop); Chromium desktop/tablet/mobile |
| URL navigation | Homepage keyboard journey, reload, back/forward, filter-page reset, pagination preservation and page clamping pass |
| Errors and privacy | Invalid/duplicate parameters, unsupported/ambiguous locations, empty results, adapter retry and exclusion of private/unpublished fixture data pass |
| Progressive enhancement | Homepage GET search passes with JavaScript disabled |
| Accessibility/runtime | Zero detected axe WCAG 2 A/AA and 2.1 AA violations on route, filtered-results and correction-state checks; route checks report no page errors or viewport overflow |
| Visual review | Home/directory/results/error screenshots reviewed across desktop, tablet and mobile in `output/playwright`; existing typography and theme retained |
| Ordinary `npm run build` | Expected rejection without explicit demo mode |

Browser testing exposed native history restoration of edited form drafts. The small SearchForm client island now restores server-validated URL defaults; final browser checks include both affected back/forward journeys. No new dependencies or external services. No deployment or Phase 2B work.

Limitations: ten illustrative city centers, one example ZIP each, approximate straight-line distances, eight eligible sample listings. Browser checks use Chromium emulation; physical devices and Safari/Firefox remain unverified. Automated accessibility checks do not replace a full audit.

## Phase 2B verification record

Executed 2026-10-01, demo data only:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass, including new dynamic profile route and browser tests |
| `npm run lint` | Pass, zero warnings |
| `npm test` | 22 pass; direct-profile eligibility, nested public projection, inquiry type/length/email validation and safe return URL cases added |
| `npm run build:demo` | Pass, optimized build including `/professionals/[id]` |
| `npm run test:e2e` | Final full run: 36 pass, one intentional desktop menu skip, two mobile resource-related failures |
| `npm run test:e2e -- --last-failed --workers=1` | Both failed cases pass; all 38 applicable browser cases verified across these runs |
| Ordinary `npm run build` | Expected rejection: production blocked without explicit demo mode |
| Eligibility/metadata/privacy | All eight categories accessible; eight excluded fixture states and missing IDs return HTTP 404; no private fields, private names or fictional review structured data in output; noindex retained |
| Inquiry journey | Filtered search → profile → validation → local confirmation → blank reset → original results passes at all three widths; no form payload sent and no browser storage written |
| No JavaScript | Profile content/navigation work; inquiry controls disabled with truthful explanation |
| Visual/accessibility | Profile validation/confirmation layouts reviewed at 390/768/1440 px; axe reports no violations and overflow assertions pass |

Browser testing caught global loading streaming a 200 before profile not-found resolution. Loading boundaries now stay on directory/member/admin routes; direct unavailable profiles return 404 before streaming. The later mobile resource errors (`ERR_INSUFFICIENT_RESOURCES` and an axe timeout) were resolved by the targeted single-worker rerun without changing application code. Expected injected adapter errors contain no inquiry values.

Limits: Chromium emulation only, no physical devices or Safari/Firefox; automated accessibility checks are not a full audit. No real inquiry delivery, persistence, integrations, deployment or Phase 2C implementation.

## Phase 2C-1 verification record

Executed 2026-10-01, local demo only:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass, zero warnings |
| `npm test` | 27 pass, including application bounds/types/categories, pending/inactive defaults, protected-field injection, independent eligibility, credential rules, selection/reset/isolation and unchanged public directory |
| `npm run build:demo` | Pass initially; final rebuild passed with process-scoped `NODE_OPTIONS=--max-old-space-size=768` after a Node out-of-memory failure. No permanent build setting changes |
| `npm run build` | Correctly rejects missing production opt-in |
| `npm run test:e2e -- --workers=1` | 44 pass, one intentional desktop menu skip, three no-JavaScript member loading failures |
| Targeted final member/layout browser run | 12 pass after the loading-boundary fix; all 47 applicable browser cases verified across the runs |
| Native submission guard | Application/member controls are disabled before hydration and without JavaScript; explanatory content renders without scripts |
| State/navigation | Application → pending confirmation → member edits → application/navigation return, explicit reset, refresh reset and independent tabs pass |
| Data/side effects | No form payload sent, no localStorage/sessionStorage writes, no local edits published; inbox is independently seeded |
| Accessibility/visual review | Desktop/tablet/mobile at 1440/768/390 px reviewed; application errors and member journeys have zero detected axe violations, no overflow or page errors |
| Code review | Shared form/validator/reducer; explicit edit allowlist; removed obsolete server member-summary getter; no private server records in client fixture source; no admin actions or integrations |
| Git | Initialized locally; ignored secrets/private sources/generated files/dependencies; source-tree checkpoint at `refs/checkpoints/pre-phase-2c1`. No commit identity available, so no commit was created. No remote or push |

The no-JavaScript failures exposed a streaming member loading screen that needed scripts to reveal its content. Removing that route boundary preserves readable sample content and disabled forms without scripts. Only affected member/layout cases were rerun after the fix and minor field-layout refinement. A temporary process heap cap resolved the host build memory failure; application code was not changed to bypass type checking.

Limitations: Chromium emulation only; physical devices/Safari/Firefox and a complete accessibility audit remain later work. React session state resets on refresh, full-document navigation or explicit reset. No permanent save, owner notification, server publication, real authentication or delivery exists. Stop before 2C-2 admin workflows.

## Phase 2C-2 verification record

Executed 2026-10-01, local demo only:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass, zero warnings |
| `npm test` | 33 pass: includes application/admin/member coherence, independent eligibility, protected edits, stable credential identity/revocation/reordering/changed claims, category invariants, public allowlists and reset |
| `npm run build:demo` | Pass with process-scoped `NODE_OPTIONS=--max-old-space-size=768`, reusing the prior host memory workaround; no permanent setting changes |
| New desktop admin browser journeys | 3 pass, including cancellation and no-JavaScript guards |
| `npm run test:e2e -- --workers=1` | 56 pass, one intentional desktop-menu skip, 4.6 minutes; all three viewport projects passed |
| `npm run build` | Correctly rejects missing demo opt-in; production remains blocked |
| Rendered review | Desktop/tablet/mobile at 1440/768/390 px inspected; existing theme retained, no horizontal overflow, visible focus and no detected axe violations |
| Code review | Removed competing server roster and separate credential verification copy; one reducer/provider, shared public presentation and validation; no form submission/storage/logging calls; no new dependencies |
| Git | Pre-edit tree checkpoint `refs/checkpoints/pre-phase-2c2`; identity unset, no commit invented; no remote, push or deployment |

Browser coverage includes application → admin → member → current confirmation, inactive approval, suspension/reinstatement, credential verification/removal/editing, category propagation, public-field exclusions, filters/empty states, reset, keyboard validation and no network mutations/browser storage. Existing search/profile/inquiry regressions remain in the suite. Expected injected adapter failures contain no form contents.

## Phase 2D verification record

Executed 2026-10-01, dashboard refinement only:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass, zero warnings |
| `npm test` | 35 pass; validated dashboard URLs and derived counts added, existing eligibility/credential/category/public-field rules retained |
| `npm run build:demo` | Pass with process-scoped `NODE_OPTIONS=--max-old-space-size=768`; no permanent setting changes |
| `npm run test:e2e -- --workers=1 --max-failures=1` | Final full run: 65 pass, one intentional desktop-menu skip, 4.1 minutes |
| `npm run build` | Expected rejection without explicit demo opt-in |
| Navigation/drafts | Direct sections, malformed parameters, back/forward, filtered list → record → list, missing records, section/record/category drafts, unapplied filter drafts, confirmed/cancelled reset and refresh reset pass |
| Existing workflows | Application → admin → member coherence, protected fields, independent eligibility, credential changes, stable category associations, public projection and search → profile → inquiry regressions pass |
| Accessibility/rendered review | Desktop/tablet/mobile at 1440/768/390 px; long names, profile forms, empty inbox, application tables, errors, confirmation, category and credential screens inspected; no detected axe violations or page overflow in tested views |
| Demo safety | No-JavaScript forms disabled; browser tests confirm no form payload submission or storage writes; public directory remains unchanged |
| Code review | Shared navigation, draft provider, status summary, register, decision form and reset; existing reducer remains the accepted-state writer; no new dependencies or integrations |
| Git/scope | Clean starting tree; local checkpoint `381651d`; no Phase 2D push or deployment, later backlog preserved |

Earlier browser runs exposed a wrapped table-link hit area and a rapid clear-filter/navigation race. Links now have a full block hit area; controlled filter drafts and pending-navigation guards preserve interactions. The final complete suite above passed after both fixes. Injected adapter-error logs are expected fixtures and contain no form values.

Limits: React-session drafts disappear on refresh/full-page navigation/reset. Chromium emulation only; physical devices, Safari/Firefox and a full accessibility audit remain unverified. No real accounts, persistence, publication, delivery or integrations.

## Phase 2E-1 verification record

Executed 2026-10-02, public demo Q&A only:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass, including final browser-test additions |
| `npm run lint` | Pass, zero warnings |
| `npm test` | 41 pass; six Q&A tests cover field/query bounds, safe returns, publication/parent rules, projections, eligible links, filtering/pages and pending/reset state |
| `npm run build:demo` | Pass, including final mobile spacing adjustment; existing process-only 768 MB Node heap cap used |
| New desktop Q&A browser run | 5 pass |
| `npm run test:e2e -- --workers=1 --max-failures=1` | 80 pass, one intentional desktop-menu skip, 4.5 minutes; existing dashboards/directory/profile/inquiry journeys preserved |
| Final targeted Q&A layout/submission run | 6 pass across desktop/tablet/mobile after mobile result-heading adjustment and strengthened confirmation/refresh checks |
| `npm run build` | Expected rejection without explicit demo opt-in |
| Public boundary | Missing/unpublished/session-only IDs return generic 404s; HTML, metadata, RSC/script payload tests exclude hidden fixtures/private moderation fields; generated browser assets contain no private Q&A fixture markers |
| State and side effects | Draft survives client navigation and search; successful submission forces pending and stays absent from public results; reset cancellation/confirmation and refresh clearing pass; no non-GET/form-payload requests or browser-storage writes |
| Accessibility/visual review | Desktop/tablet/mobile (1440/768/390 px), plus 900 px navigation; list/detail, long titles, answers, empty/error/form/confirmation screens inspected; no detected axe violations or page overflow in tested Q&A screens |
| No JavaScript | Seeded list/search/detail remain readable and usable; question mutation controls disabled with an explanation |
| Code review and scope | Explicit projections, one shared reducer/draft provider, typed adapter and validation; no duplicate catalog, raw HTML, new dependencies, delivery endpoints or moderation controls |
| Git | Phase 2D preserved in local checkpoint `713c45c` before editing; no push or deployment |

Full regression checks passed before a final CSS-only mobile result-heading adjustment; the affected layout and submission cases were rerun afterward. Screenshots are in `output/playwright/phase-2e1-*`. Expected injected adapter failures contain no submitted text. Chromium emulation and automated accessibility checks do not replace physical-device/Safari/Firefox checks or a full audit. This was the completed 2E-1 boundary; the 2E-2 work is recorded below. All real integrations remain deferred.


## Phase 2E-2 verification record

Implemented 2026-10-02; verification finalized 2026-10-03. Session-only demo; stop before another phase.

| Check | Result |
| --- | --- |
| `npm run typecheck` / `npm run lint` | Pass; no lint warnings |
| `npm test` | 45 pass, including eligibility combinations, selected-author/forced-pending protection, validation bounds, parent/answer transitions, exact public allowlists, stable IDs, repeated/invalid decisions and reset |
| `npm run build:demo` | Pass with the existing process-only 768 MB Node heap cap |
| Browser suite | 92 applicable cases passed across completed runs; one intentional desktop-menu skip. All desktop cases and the earlier tablet regressions passed in the full run; after correcting new test navigation waits, eight tablet/mobile Q&A cases, 18 remaining Q&A/search cases and 18 mobile regression cases passed |
| `npm run build` | Correctly rejects missing demo opt-in; production remains blocked |
| Session journeys | Public question → admin publication → member pending answer → admin publication → public answer → rejection/hiding → unavailable content → reset; cancellation, drafts, member selection, refresh, filters and third-page pagination pass |
| Boundaries | Public seed snapshot only; private fixture markers absent from browser assets/HTML/payloads. Own-answer and public projections exclude internal notes; no submission requests, storage or content logging added |
| Routes and no JavaScript | Neutral HTTP 200 HTML for session IDs, generic no-index metadata and honest hydrated availability; private/missing server IDs remain generic 404s; readable published seeds and disabled mutation controls without scripts |
| Rendered review | Desktop/tablet/mobile (1440/768/390 px) Q&A member/review/public screens inspected. No detected axe violations, overflow or page errors in tested views; existing design retained |
| Code/scope review | Shared provider/reducer, focused components and explicit projections; no new dependencies/integrations or private server fixture imports. Existing About Us and all other approved backlog entries preserved. No push or deployment |

Earlier browser failures were test synchronization errors: history/menu actions ran before navigation completed. Destination assertions fixed them; affected cases and previously unrun regressions were completed without rerunning unrelated passing cases. Expected injected adapter-error logs contain no submitted content. Screenshots: `output/playwright/phase-2e2-*`. Physical devices, Safari/Firefox and a full accessibility audit remain unverified. Policy decisions and integration requirements are documented in the handoff.

## Phase 2F-1 verification record

Implemented and verified 2026-10-03. Public request demo only; 2F-2 management remains unstarted.

| Check | Result |
| --- | --- |
| `npm run typecheck` / `npm run lint` | Pass; no lint warnings |
| `npm test` | 49 pass, including consultation bounds/enums, explicit fields, forced lifecycle/offer values, duplicate guard, stable IDs, reset and state isolation |
| `npm run build:demo` | Pass with the existing process-only 768 MB Node heap cap |
| Browser suite | 101 applicable cases passed across completed runs; one intentional desktop-menu skip. Includes nine new consultation cases across desktop/tablet/mobile |
| `npm run build` | Correctly rejects missing demo opt-in; production remains blocked |
| Request journeys | Homepage/navigation → consultation → validation → draft navigation → confirmation → another request; cancelled/confirmed reset and refresh clearing pass |
| Boundaries | No form network mutations, browser storage, content logging or public projection of requests; safe no-index HTML and disabled no-JavaScript/prehydration form |
| Rendered review | Consultation, validation, confirmation and homepage reviewed at 1440/768/390 px; navigation at 1181/1100 px. No detected axe violations, overflow or page errors in consultation journeys |
| Code/scope review | Existing provider/reducer, typed shared validation and configuration-owned offer reused; no dependencies/integrations. `git diff --check` passed; no push or deployment |

The initial full browser run and later mobile run exposed existing Q&A test navigation races. Destination assertions fixed them; affected and previously unrun cases passed in targeted runs, rather than repeating the whole suite. Screenshots: `output/playwright/phase-2f1-*`. Physical devices, Safari/Firefox and a full accessibility audit remain unverified. Client decisions, state contract and remaining 2F-2/integration work are in the handoff. Full homepage, client-supplied About Us story/text/video and all other approved backlog features remain preserved.

## Phase 2F-2 verification record

Implemented 2026-10-03; verification finalized 2026-10-04. Session-only coordination; stop before another phase or integrations.

| Check | Result |
| --- | --- |
| `npm run typecheck` / `npm run lint` | Pass; final changed test/page files also pass focused lint |
| `npm test` | 56 pass; lifecycle/confirmation guards, eligibility/category matrix, ownership, repeated actions, protected values, stable IDs, projections, note bounds, URL filters and reset/isolation |
| `npm run build:demo` | Pass with existing process-only 768 MB Node heap cap, including final copy/style refinements |
| Browser suite | 113 applicable cases passed across completed runs, one intentional desktop-menu skip; all 76 tablet/mobile cases passed together |
| Coordination journeys | Public request → admin assignment → member acceptance → public status → confirmed unassignment/reassignment/cancellation → reset; dismissed dialogs, decline, eligibility changes and additional requests pass |
| Boundaries | Unassigned/unowned requests hidden from members; contact details/admin notes absent from member/public summaries; no network mutations/browser storage; missing IDs, no-script/prehydration and no-index checks pass |
| Rendered review | Desktop/tablet/mobile admin detail/list, member accepted/attention and public confirmation screenshots inspected; no detected axe violations, overflow or consultation page errors |
| Production guard / review | Default build correctly blocks missing demo opt-in. Explicit projections and reducer rules reviewed; `git diff --check` passes. No new dependencies, services, push or deployment |

Adding the second eligible fixture required existing count assertions and one listing selector to be updated. Failed/unrun regressions were completed in targeted runs; this was not one uninterrupted full passing suite. Affected desktop consultation screenshots/journeys were repeated after final style/copy refinements. Screenshots: `output/playwright/phase-2f2-*`. Physical devices, Safari/Firefox and a full accessibility audit remain unverified. The handoff records provisional policies and remaining client decisions. Fuller homepage, client-supplied About Us story/text/video and all other approved backlog features remain preserved.

- [x] 2026-10-07 homepage refinement: one compact session-aware statistics row beneath the desktop hero description, after search on mobile/tablet; lower panel removed, definitions retained in disclosure and shared decorative stars hidden from assistive technology.
- [x] 2026-10-07 selective public brand copy: brand-only hero kicker, platform introduction with existing-section links, concise public discovery link labels, retained service explanations and unchanged routes/controls. Lint/typecheck and nine targeted responsive navigation checks passed.
- [x] 2026-10-07 navbar refinement: remove separate Home link, retain accessible logo home navigation, increase desktop/mobile menu spacing, and verify keyboard/responsive/signed-in navigation with eight passing browser checks.
- [x] 2026-10-08 normal website copy: replace demo/temporary labels across public pages, sign-in, workspaces, forms and visible fixtures; preserve synthetic session behavior and integration limits. Typecheck, lint, 85 unit tests, demo build and all 195 applicable browser cases pass across completed runs. See [copy cleanup verification](normal-website-copy.md) for run details and screenshots.
- [x] 2026-10-08 sign-in refinement: responsive brand/form card, Professional/Administrator choices, masked access code and collapsed Quick access presets. Typecheck, lint, 85 unit tests, demo build and 33 focused responsive sign-in/member/admin browser cases pass. Four viewport screenshots reviewed; session-only identity behavior preserved. See [verification](normal-website-copy.md#sign-in-presentation-refinement--2026-10-08).
