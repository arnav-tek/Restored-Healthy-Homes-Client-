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

## Visual refinement — 2026-10-06

Implemented the user's design-refinement request within Phase 2H-1, separately from the original functional completion. Existing catalog/search URLs, public projections, statistics calculations, session workflows, moderation rules, offer configuration and production guard remain unchanged. Static home/About sections remain Server Components; statistics reuse the existing client island. No dependencies, skills, imagery, media assets, stores or integrations were added.

### Final composition

- Home: concise sage introduction → primary search panel → catalog icon grid → sage statistics panel → split introduction and vertical numbered journey → asymmetric Q&A/consultation introductions → editorial About introduction → one dedicated sage business application CTA.
- Search: horizontal desktop fields/action, two-field tablet row and stacked mobile controls. Secondary browsing and the general fictional-data/form notice follow search. At 390 × 844, Search moved from y=1,004 to y=521 and ends at y=568, fully inside the initial viewport. At 320 px it ends at y=653. No fixed hero height, clipping or reduced control/text sizes were used.
- Categories: four columns above 1050 px, two through tablet and one compact icon/text row per link on mobile. Full names/descriptions come from the existing catalog. Lucide icons are mapped by stable IDs with a neutral fallback; entire links have equivalent hover/focus feedback.
- Statistics: consistent numerals and plain labels, one concise fictional-data/location disclaimer, and an accessible native definitions disclosure. Individual published-review weighting, eligibility filtering, zero/no-rating/unavailable states and immediate review-moderation updates remain intact.
- About: balanced title/introduction; distinct company-story and purpose hierarchy; story beside a responsive static 16:9 video frame; complete directory closing invitation with a secondary application link. Short labeled replacement copy stays in `src/data/content/about.ts`. Native video controls, `preload="none"`, no autoplay and optional captions/transcript branches are preserved.
- Shared layout: visitor and professional/workspace footer groups keep every existing destination and 44 px link targets. Header brand text and its decorative mark can reflow/grow under text enlargement; menu scroll height remains bounded on short viewports. The navigation breakpoint and account behavior remain unchanged. Obsolete home-only hero/path rules were confirmed unused and removed; existing home/About styles were refactored in place.

### Evidence and checks

Before/after captures are local artifacts in `output/playwright/phase-2h1-refinement-{before,after}-{home,about}-{desktop,tablet,mobile,narrow,navigation-1280,navigation-1279}.png`. Mobile captures use 390 × 844; narrow captures use 320 × 844. First-screen, header-only and 200% text-size captures are also retained. Geometry records are `phase-2h1-refinement-{before,after}-geometry.json`.

Reviewed actual home/About renders at 1440, 768 and 390 px, plus 1280/1279 px navigation, 320 px and enlarged text. Visual review caught header overflow under doubled text and insufficient space for the decorative mark; those were corrected. Enlarged-text testing doubles measured element font sizes in a fixed 390 px viewport, allowing natural vertical scrolling. It is a text-reflow simulation, not a physical-device or every-browser text-zoom claim. Search remains usable in the enlarged-text test.

Typecheck, zero-warning lint, 78 unit tests, demo build and missing-opt-in production rejection passed. The existing `.env.local` has explicit demo opt-in; it was temporarily moved for the missing-opt-in build check, then restored in `finally`. No environment contents were logged. Builds and previews were coordinated, with previews stopped before rebuilding. A process-only 768 MB heap cap was retained for builds.

Focused browser run: **72 passed, three intentional skips**, using `home-about`, `search`, `preview`, `profiles`, `demo-sign-in` and `consultations`, all three viewport projects. Skips are the existing desktop mobile-menu case and two duplicate narrow/text checks, which run once under the desktop project with explicitly resized viewports. Tests now visit all eight category destinations and check first-screen mobile Search, definitions disclosure, 320 px/200% text reflow and short-screen keyboard menu behavior. Existing state, privacy, no-script, side-effect, accessibility, overflow and error assertions remain. Updated two selectors for legitimate headline/link copy changes; the initial old-headline failure did not require application changes. Expected injected adapter failures remain synthetic test fixtures.

After the final logo/text-size and footer touch-target adjustments, the demo rebuild passed and the affected `home-about`/`preview` rerun passed **24 cases with three intentional skips**. Final changed tests passed ESLint and `tsc --noEmit`; `git diff --check` passed. Final screenshots were refreshed on that build and inspected, including signed-in navigation at 1280 px and About Us at 320 px. The local preview is running at `http://127.0.0.1:3200/` and `/about` for review.

This is focused regression coverage, not a full repository browser rerun for the refinement. Physical devices, Safari/Firefox, a full accessibility audit and supplied-video playback/caption/transcript checks remain unverified. Ignored project-local design skills and confidential source documents are absent from this checkout; no skill installation or source reconstruction was attempted.

### Still outstanding

Final company story, personal “Why,” approved copy, professionally produced video, optional poster, captions and transcript remain client-supplied work. **Visual client/user approval remains pending until reviewed.** No later public-page milestone is marked complete. Stop before Phase 2H-2; no push, deployment or real integrations.


## Statistics and journey follow-up - 2026-10-06

The user requested a redesign of the directory statistics and three-step journey shown in their screenshot, plus a review of remaining scope. Statistics now use a contrasting sage surface with larger numerals, separated columns and an integrated definitions/disclaimer footer. The journey pairs an editorial introduction and directory link with a connected vertical sequence; mobile stacks the introduction above the steps. Existing statistics computations, test IDs, session updates, empty/error states and demo disclaimers are preserved. No new dependencies, data fields or integrations.

Actual desktop/tablet/mobile section captures are in `output/playwright/section-redesign-{desktop,tablet,mobile}.png`; all three were inspected, with no horizontal overflow. Remaining scope is unchanged: approved copy/media and demo review, remaining public content/search details, production accounts/data/admin, billing/email, community/consultation/content integrations, then launch verification and handoff. See the scope audit and Phases 3-6 in `docs/build-checklist.md`.

Verification: typecheck, zero-warning lint, 78 unit tests and optimized demo build passed. The full browser run passed 142 cases, then stopped on a mobile Q&A response-body capture timeout (one concurrent case interrupted; three intentional skips; 18 unrun). The failed, interrupted and remaining mobile cases were covered by a 22-case single-worker rerun, all passing without code changes. Thus all 162 applicable browser cases passed across the two runs; this was not one clean uninterrupted suite. The timed-out test passed in 1.2 seconds on rerun. The trace showed response bodies being captured across navigation; the root cause of the transient timeout is not established. Home/About, responsive screenshots, 320 px, doubled text, accessibility, error, no-script and review-state checks passed in the first run.

The production guard is unchanged and covered by the passing unit suite; the preceding refinement's missing-opt-in build rejection remains the latest direct build-guard check. Chromium emulation only; physical-device and Safari/Firefox review remain outstanding. The user subsequently authorized committing and pushing this follow-up to GitHub. Public deployment remains outside this follow-up.


## Two-column hero restoration - 2026-10-07

The user clarified that only the homepage hero should return to a two-column layout. CSS now places the current introduction on the left and the stacked search card on the right above 820 px. The demo note and browse link span the bottom row. At tablet/mobile widths the hero stacks, preserving compact mobile search. Existing copy, navigation, data behavior and every section below the hero are unchanged.

Typecheck, zero-warning lint, 78 unit tests and demo build passed. Focused `home-about` and `search` browser tests passed 25 cases with two intentional duplicate narrow/text-size skips. These cover desktop/tablet/mobile, 320 px, doubled text, keyboard/no-script search, accessibility, error states and session statistics. Actual hero screenshots at 1440/768/390 px were inspected: `output/playwright/two-column-hero-{desktop,tablet,mobile}.png`. No horizontal overflow was observed. This follow-up did not repeat the entire repository browser suite or direct missing-opt-in build check; guard unit tests pass and production configuration is unchanged. Physical devices and other browser engines remain unverified. Local preview: `http://127.0.0.1:3200/`. No push or deployment performed for this follow-up.


## Public-facing copy cleanup - 2026-10-07

The user requested removal of demo/preview/data labels to improve presentation, then instructed work to continue. Scope was applied to public pages: homepage, footer, About, directory, profiles, Q&A, reviews, consultations and the application form. Removed repeated banners/badges, simplified headings and actions, and updated page metadata and input-error copy. Shared application fields and reset controls also receive neutral labels. Account-selection and workspace-specific explanations remain, as do the synthetic source records and their content. No real businesses, reviews, credentials or appointments were introduced.

Form-local explanations still accurately state that entries are not delivered or saved permanently; confirmations retain current-tab lifetime and actual booking/payment state. The About story and video have concise coming-soon copy. Final client story, personal Why, video and approval remain outstanding. Existing production rejection, noindex headers, public projections, stable IDs, session state and all integrations remain unchanged. The user's two-column hero, statistics panel and vertical journey are retained.

The new presentation preference supersedes older instructions in this handoff requiring repeated public demo banners; it does not authorize integrations or deployment. Public credential headings now say 'Credentials on file' instead of suggesting real verification. Fixture provenance remains in the source and this handoff. Browser assertions were updated to the renamed public labels while retaining behavior, privacy, no-script, reset and side-effect checks. New homepage assertions guard against reintroducing the removed public banners.
