# Phase 2I-1 — directory state and rating discovery

## Delivered

- State filter with stable US postal codes (50 states and DC) and readable names; filters the listing location. Unsupported or repeated URL values produce correction guidance, never an unfiltered result.
- Minimum published-review rating choices of 1, 2, 3, 4, 4.5 and 5; Any rating includes businesses without published reviews. Uses the existing one-decimal `summarizeReviews` result consistently with profile presentation; thresholds are inclusive.
- Filters intersect keyword, category, city/ZIP and radius; A–Z/Z–A/nearest sort remains. Filter submission resets pagination; sort/page/profile-return links retain state/rating and existing filters. URL normalization, reload and history stay supported.
- Cards show numeric average, decorative accessible stars and published-review count, or an explicit no-published-reviews state. No review verification claim added.
- Existing public-only session review selector drives directory results, totals and pages after moderation. Server-rendered seed results and native GET forms still work without JavaScript. Out-of-range rating-search URLs clamp after hydration against current tab reviews, so server seed counts cannot discard pages added by same-tab publication; no-script output renders the correct clamped page without rewriting that URL.
- Preserved the uncommitted directory presentation changes present at task start. Corrected directory eyebrow/result-count/distance text contrast during accessibility checks.
- Native no-script testing exposed the directory loading boundary leaving streamed results hidden. Removed that boundary and kept client navigation feedback with `useFormStatus` inside the shared search form. Narrow doubled-text testing also corrected the top sort select's intrinsic minimum width.
- Directory titles/business names can wrap long words, and category labels grow instead of clipping at enlarged text sizes. The existing profile inquiry test now targets the exact Email label to distinguish it from the footer field.
- A wider regression exposed review submission collapsing a form underneath a double-click, allowing the second click to activate a footer link. Confirmation panels retain the submitted form's height; existing pending/repeated-submit behavior and session rules remain unchanged.
- The multi-account member lifetime test has a scoped 90-second budget instead of the global 45 seconds after timing out during account switches/reloads on the shared host. All original assertions remain. Concurrent consultation presentation changes were preserved; affected information/reset-note colors were adjusted to meet contrast checks.

## Boundaries

Only eligible public listing DTOs are sent to the results island; review inputs come from the existing explicit public projection. Private review records, contacts and notes stay in server-only fixtures. The small fixture directory is recomputed from public DTOs in the browser to support the existing tab-session overlay; production must filter/page durable data on the server rather than serialize an unbounded catalog.

No services, database, authentication, persistence, email, payments, geolocation or featured sorting added. Current tab decisions clear on full reload as before. Blogs/resources and newsletter signup are deferred at the user's request and remain in scope. Real location/service-area decisions, featured priority and production review/security work remain in the build checklist. The authoritative private overview/alignment paths were absent from this checkout; available scope coverage and decisions guided this work.

## Verification

Implemented 2026-10-07; verification finalized 2026-10-08.

| Check | Result |
| --- | --- |
| `npm run typecheck` / `npm run lint` | Pass; zero lint warnings |
| `npm test` | 85 pass, including state/rating validation, published-only summaries, intersecting filters and session publication/pagination |
| `npm run build:demo` | Pass with the existing process-only 768 MB Node heap cap; final contrast changes included |
| `npm run build` | Correctly rejects missing demo opt-in; live configuration remains blocked |
| Browser suite | All 183 applicable cases passed across completed full and targeted runs, with nine intentional viewport/duplicate skips; this was not one uninterrupted passing full-suite run |
| Final affected checks | Seven pass and two intentional duplicate skips: state/rating directory journeys and consultation summary contrast at desktop/tablet/mobile, plus 320 px doubled-text reflow |
| Rendered review | Desktop/tablet/mobile and 320 px doubled-text screenshots inspected; responsive wrapping, card ratings and filter layout verified |
| Diff whitespace | `git diff --check` passes |

Initial browser failures identified directory contrast, native no-script streaming, narrow text clipping, stale email-label selectors and review double-click clickthrough; the fixes and previously unrun regressions passed in subsequent runs. The member lifetime case passed with its scoped timeout. Concurrent consultation styling required three contrast corrections, including the status-summary label verified in the final run. Shared-host build/report contention was handled by retrying the build and isolating later browser output directories.

Screenshots: `output/playwright/directory-ratings-desktop.png`, `directory-ratings-tablet.png`, `directory-ratings-mobile.png` and `directory-ratings-320-text.png`. Browser verification uses Chromium emulation; physical devices, Safari/Firefox and a complete manual accessibility audit remain unverified. No deployment was performed for this milestone.
