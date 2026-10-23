# Quality audit — 22 October 2026

Scope: performance, accessibility, browser compatibility, demo reliability, focused maintenance and owner documentation. Fictional data only; no integrations, persistence, client-content assumptions or public deployment.

## Confirmed findings and changes

- The hero fetched both an optimized responsive image and the original 88,265-byte JPEG as the video's poster, including with reduced motion. Removed the redundant video poster; the existing image behind the video still supplies static, paused, unavailable and no-script fallbacks. Playback retains its controls and deferred loading.
- Removing a sample photo removed its preview but left the file input populated in Firefox, WebKit and Edge. Removal now clears the native file value/error and focuses the picker, so selecting the same file works again. Generation cancellation and tab-only draft isolation remain.
- Firefox falls back from `type=month` to text. The controlled analytics input rejected each intermediate keystroke and could not be edited normally. The input now accepts the draft and validates a complete calendar month separately. Invalid/empty periods show an em dash and guidance rather than a misleading zero. Other analytics counts remain available.
- WebKit skipped the initial skip-to-content anchor during Tab navigation with its default keyboard behavior. A browser probe confirmed explicit `tabIndex=0` includes it. The main target and normal focus order remain; no positive tabindex is introduced.
- Retained the current domain/validation/session boundaries. The new month parser lives in validation; no blanket suppressions, raw HTML, browser storage or duplicated eligibility logic was added. The focused source review found no additional defects requiring a broader refactor.

## Coverage and how to repeat

1. `npm run check`: typecheck, lint, unit tests and optimized demo build.
2. `npm run test:e2e`: complete existing Chromium desktop/tablet/mobile regression plus the new quality cases.
3. `npm run test:compat`: focused Firefox desktop, WebKit mobile and installed Edge tablet matrix. Includes public search/history/no-script behavior, video/map fallbacks, admin editing/publication, identity, membership/featured eligibility and the new focus/photo/month/error cases. Install Firefox/WebKit with `npx playwright install firefox webkit`; Edge must already be installed.
4. `npm run audit:performance -- latest`: local Chromium mobile lab measurements, three cold-cache samples per route, reduced motion, 4× CPU slowdown, 150 ms simulated latency and 200,000 bytes/s download. The script owns port 3102 and writes `output/quality-performance-latest.json`. Run separately from builds and other browser jobs. Long-task totals cover the observation window and are not Lighthouse TBT; no INP claim is made.
5. `npm run build` without demo opt-in must fail. Review desktop/tablet/mobile screenshots in `output/playwright`.

The first attempted measurement overlapped the baseline build, causing preview chunk failures. That attempt was discarded. The clean baseline measurements and defect reproductions used a completed unchanged build. One initial test also queried the mobile toggle by its old accessible name after opening it; the assertion now uses Close navigation. No application assertion was removed to hide a defect.

The extended matrix also exposed Chromium assumptions in older tests. They now wait for hydrated controls and destination/focus changes, use keyboard activation for the affected scroll-sensitive steps, confirm native details are open and check the inline-video HTML attribute because Firefox does not expose the corresponding property. Mobile WebKit's default Tab setting skips ordinary navigation links; Escape is tested from an explicitly focused descendant. Its native media transport on Windows can bypass aborted network routes, so the WebKit failure case loads invalid media bytes to exercise the real decoder/error event. The lazy map is scrolled into view before checking its contents. The application's media and scroll behavior are unchanged by these test corrections.

## Documentation delivered

- [Owner walkthrough](admin-guide.md): current account switching, applications, eligibility, editing, categories, certification/resources publication, Q&A, consultations, reviews, analytics and reset/recovery.
- [Client acceptance checklist](client-acceptance-checklist.md): demo review, pending content/policy decisions and later connected-platform/launch acceptance. No unchecked client decision is treated as approved.
- README includes browser installation, compatibility and performance commands and build/preview sequencing.

## Verification and performance results

| Check | Result |
| --- | --- |
| `npm run check` | Passed typecheck, zero-warning lint, all 106 unit tests and optimized demo build. |
| Final test-source checks | Fresh `npm run typecheck` and `npm run lint` passed after the browser-test corrections. |
| Chromium regression | All 268 applicable scenarios passed across completed runs; 11 intentional shared/viewport skips. The full 279-case run had 265 passes and three failures. The final affected run passed all seven applicable checks with two duplicate-viewport skips. |
| Firefox / WebKit / installed Edge | All 66 applicable matrix scenarios passed across the complete run and targeted corrections; three intentional shared narrow-screen skips. The initial full matrix had 57 passes and nine failures. All affected cases were verified in completed follow-ups; this was not one uninterrupted green matrix run. |
| Default production build | `npm run build` without demo opt-in correctly failed with exit 1 and “Production is blocked.” |
| Visual/accessibility review | Reviewed fresh 1440px desktop hero, 768px tablet analytics and 390px mobile hero, plus Firefox/WebKit month fields and editor views. No presentation issues in the inspected images; tested axe/overflow assertions passed. Shared 320px and enlarged-text cases also passed. |

The Chromium follow-up retained every assertion. The existing six-page/viewport education/pricing audit exhausted its 45-second test budget; its explicit budget is now 90 seconds, and the isolated rerun completed in 23.1 seconds. A mobile Q&A case now waits for the Answers queue's URL/current state before filtering. One tablet privacy HTTP read encountered `ECONNRESET`; the unchanged boundary test passed in the final run across all three viewports. No automatic blanket retries or application bypasses were introduced.

Evidence is ignored under `output/`: `quality-final-check.log`, `quality-final-static.log`, `quality-full-e2e.log`, `quality-regression-corrections.log`, `quality-compat-final.log`, `quality-compat-resumed.log`, `quality-webkit-final.log`, `quality-webkit-certification.log` and `quality-production-guard.log`. The first correction attempt was interrupted before completion and is not counted as a completed suite. Screenshots include `playwright/hero-motion-{desktop,tablet,mobile}.png`, `playwright/admin-analytics-tablet.png`, `playwright/quality-*.png` and the refreshed admin/320px captures.

Three cold-cache browser samples per route were taken for the baseline and final build. A second isolated final batch checked timing variability. Chromium 153.0.8010.12, 390×844 viewport, reduced motion, 4× CPU slowdown, configured 150 ms latency and 200,000 bytes/s download were used throughout. The local server/filesystem were warm; this is not a production measurement.

| Route | Baseline median observed LCP | Final median | Confirmation median |
| --- | ---: | ---: | ---: |
| Homepage | 2.456 s | 2.260 s | 1.992 s |
| Directory | 2.252 s | 1.996 s | 2.228 s |
| Resources | 1.580 s | 2.068 s | 1.388 s |
| Signed-out admin entry | 1.448 s | 2.368 s | 1.604 s |

The directly attributable saving is one **88,265-byte original poster request per homepage load**. The browser now requests only the 13,954-byte optimized image for the static hero. Measured homepage subresources fell from a median 298,125 bytes to 209,890 bytes, then 209,888 in confirmation (about 29.6%); these totals exclude the main HTML document and autoplay video. Other routes transferred approximately the same compressed JavaScript, about 154–180 KiB.

Timing varied on unchanged routes as well. The first final admin sample had a 7.904-second observed LCP and substantial long tasks; confirmation samples were 1.508–1.616 seconds with the same JavaScript bytes. That outlier is retained in the raw report. The timings do not establish a causal speed improvement across the site or meet a production speed target. Observed layout-shift sums were zero on the public routes and about 0.009 on the signed-out admin entry. No INP or authenticated workspace performance claim is made.

Raw measurements: `output/quality-performance-{baseline,final,confirmation}.json`, with final/confirmation command logs alongside them. The deterministic transfer checks, unchanged payload sizes on other routes and repeatable script are the useful outputs for later comparison with approved media, hosting and real devices.

## Remaining limitations

Physical iPhone/Android, Safari on Apple hardware, assistive-technology user testing, a full manual accessibility audit and deployed production performance remain unverified. Automated axe checks and engine emulation cover the exercised views only. The lab uses a local warmed server and synthetic data; reduced motion excludes autoplay video transfer. Final client footage/content can change costs. Real records, auth/ownership/RLS, payments, email, secure uploads, production publication/reporting and launch acceptance remain later work.

The authoritative overview/alignment and installed skill directories referenced in AGENTS.md are absent from this checkout. Existing implementation, available handoffs and bundled framework guides were used; confidential documents were not recreated or placed in public assets.
