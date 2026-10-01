# Build milestones and acceptance

The [overview](../Project%20overview/restored-healthy-homes-project-overview.md) and [alignment](../Project%20overview/client-conversation-alignment.md) define final scope. These milestones sequence implementation, not exclusions.

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

## Phase 2E-2 — demo answers and moderation (not started)

- [ ] Define member-answer eligibility separately from public-listing eligibility; implement permitted answer drafts/submission.
- [ ] Admin question/answer publication, rejection and removal with confirmations, clear feedback and parent visibility rules.
- [ ] Combine public seed snapshots and session submissions through explicit projections and session moderation overrides; never expose private server fixture records.
- [ ] Shared member/admin/public session journeys, moderation boundaries, regression checks and handoff.

## Phase 3 — real accounts and administration integrations

- [ ] Supabase schema/migrations, Auth/Storage, server authorization, RLS/grants and ownership tests.
- [ ] Applications, approval/rejection/suspension, profile editing and safe uploads.
- [ ] Member/admin portals, category renaming, credential review/badges, audit trails.
- [ ] Notifications once email integration is ready; real role/tenant isolation checks and review.
- [ ] Extend demo search to real location/service-area data and state/rating filters when relevant data/decisions are ready.

## Phase 4 — memberships, featured listings and email

- [ ] Resolve combined billing/lifecycle rules, then Stripe memberships and customer billing management.
- [ ] Verified/idempotent webhooks, reconciliation, state matrix including suspension.
- [ ] Featured upgrade rules, entitlement/priority placement, notifications.
- [ ] Email templates, provider integration, delivery/error behavior, public-form abuse controls.
- [ ] Test-mode walkthrough; no real payments without launch authorization.

## Phase 5 — community, consultations and content

- [ ] Real inquiry persistence/delivery, questions/answers, category matching, alerts and moderation (demo inquiries: 2B; public demo Q&A: 2E-1; demo answers/moderation: planned 2E-2).
- [ ] Reviews/ratings with agreed verification/moderation.
- [ ] Paid consultations after routing/matching/scheduling/refund/delivery decisions; commercial terms remain in the private authoritative scope.
- [ ] External certification/education resources, blog/resources CMS, newsletter consent/signup.
- [ ] About Us with client story/text/video and accessible media; agreed client legal-copy placement.
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

Full regression checks passed before a final CSS-only mobile result-heading adjustment; the affected layout and submission cases were rerun afterward. Screenshots are in `output/playwright/phase-2e1-*`. Expected injected adapter failures contain no submitted text. Chromium emulation and automated accessibility checks do not replace physical-device/Safari/Firefox checks or a full audit. Phase 2E-2 is not started; all real integrations remain deferred.
