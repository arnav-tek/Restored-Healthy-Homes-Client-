# Phase 2H-1 handoff

Implemented 2026-10-06. Homepage and About Us layout only; stop before 2H-2. No integrations, deployment or push.

## Pages and walkthrough

- `/`: existing city/ZIP/category search, eight shared-catalog category links, demo statistics, three visitor steps, Q&A/consultation/application introductions and an About Us introduction. Subscription prices and directory filters are unchanged. The consultation teaser is consolidated into the feature section.
- `/about`: company-story and purpose sections, a prominent static video placeholder and browse/apply actions. Header (including mobile disclosure) and footer link to it. Navigation collapses below 1280 px and its open menu can scroll on short screens.
- Start on Home, choose any specialty to see filtered results, then open About Us from the header. Use the existing demo review/admin walkthrough to publish or reject a review; return Home through the site navigation to see its contribution reflected. A full reload restores the seed data.

Static content stays server-rendered. Only the statistics subscribe to the existing React session; no additional store, persistence, account behavior or private data projection was added. The homepage sends only eligible listing IDs and states to that island. Existing theme, typography, keyboard focus and reduced-motion rules remain.

## Statistics definitions

- **Eligible public professionals:** unique IDs from the public directory projection, intersected with the current public review snapshot. The existing rule remains approved + active subscription + no suspension; separate member/admin listing decisions do not update this server snapshot.
- **States represented:** distinct nonblank listing-state values (trimmed and normalized to uppercase). Missing states are excluded and their number disclosed; this is location representation, not verified service coverage.
- **Average rating:** all individual published ratings for those IDs, after existing session merge/deduplication, status filtering and public projection. Reuses `publicSessionReviews` and `summarizeReviews`; rounded to one decimal, never an average of professional averages. Initial samples: 8 professionals, 7 states, 6 published reviews, 4.2/5.
- Pending/rejected reviews do not contribute. Publishing/rejecting updates the same-tab figure; zero ratings show “No published ratings yet.” Zero listings remain zero, never fabricated traction. Repository failure shows unavailable statistics rather than invented zero counts. Snapshots and moderation remain fictional, local and reset on reload.

## Content still needed

`src/data/content/about.ts` is the single typed replacement module for the introduction, company story, purpose and video assets. No approved final story, personal “Why,” supporting copy or video was available in the relevant sources. Current copy is explicitly provisional; layout completion is not final content approval.

Await client-approved story/copy, professionally produced video, optional poster, captions and transcript. Nullable local asset slots are ready for those files; the native video branch uses controls, no autoplay and `preload="none"`. Current output contains no player, play button, iframe or third-party requests. Final playback/caption/transcript acceptance must be checked with the actual assets.

## Verification

- Typecheck, lint and all 78 unit tests passed. Default build rejected missing production opt-in as expected; demo build passed before starting browser previews.
- 92 applicable browser cases passed across completed runs, with one intentional desktop-menu skip. Ran `npm run test:e2e` for `home-about`, `search`, `preview`, `profiles`, `demo-sign-in`, `member`, `consultations` and `review-moderation` across desktop/tablet/mobile. This is affected-suite coverage, not a full repository browser rerun. The nine new cases cover all category links, metadata/navigation, current-session ratings, private-field exclusions, no-script output and unavailable-statistics handling.
- A mobile no-JavaScript search case initially timed out during automatic scrolling. Added an explicit scroll and full-viewport assertion before the unchanged click/result check; the targeted case then passed. No force click, disabled assertion or application workaround was used.
- Inspected actual `output/playwright/phase-2h1-*.png` renders at 1440, 768 and 390 px, plus navigation at 1180/1280 px including a signed-in account. Accessibility, overflow and normal-page browser-error assertions passed. Visual review corrected the hero secondary button’s specificity; rebuilt with previews stopped and reran affected coverage on that final build. The unavailable-data fixture intentionally exercises adapter failures.
- Reviewed the changed code for public projections, duplicate state/calculations, controls and side effects. No new dependencies, remote imagery/player, storage or network submissions. `git diff --check` passed. Actual supplied-video playback/caption behavior remains unverified until assets exist.

Education/certifications, blog/resources, newsletter, featured placement, search refinements, legal copy and all accepted integration/backlog items remain open. No later-phase scope was implemented.
