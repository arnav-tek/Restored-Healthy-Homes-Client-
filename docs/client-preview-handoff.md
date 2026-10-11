# Client-preview handoff — 2026-10-11

The frontend is prepared for review with fictional listings, sample editorial content and workflows held only in the current tab. This is a review preview, not a live service. No deployment, commit or push was performed.

## Ready to review

- Homepage: two-column desktop hero; compact public-data statistics, published-review count and definitions; search priority on mobile; specialty browse; consultation offer; review process; featured examples and professional education link.
- Directory/profile: existing search, location/state/rating filters, sorting and return links; public-only eligibility; reviewed credentials separated from submitted claims; clear missing-photo states; inquiry and published-review presentation.
- Education/pricing: eight specialty pathways, existing membership rates and a separate consultation card using the shared offer configuration.
- Resources: sample article listing/detail layouts, category filtering, empty/invalid states and a typed content repository for future CMS integration. Newsletter preview validates and clears the address, with an explicit confirmation that no subscription occurred.
- About/contact/legal: story/video layout retained; approved assets/copy can be supplied later. Contact details and legal wording are clearly pending approval.
- Member/admin demos: public application, profile editing and preview, inquiry inbox, membership status, application decisions, suspension, credential review, category labels, Q&A moderation, review moderation and consultation coordination.
- Demo safeguards: owning member/admin profile edits; admin-only listing, suspension, credential and category mutations. Edited credential claims lose review status. Published member Q&A attribution uses only the explicit eligible profile association.

## Short walkthrough

For a fresh local review, run `npm run build:demo`, then `npm run preview -- --port 3200` and open <http://127.0.0.1:3200>. This starts only a local demo preview.

1. Open the homepage. Try a specialty search, inspect a profile, expand the statistics definitions and compare the desktop/mobile hero.
2. Explore Education and Pricing. Follow the consultation offer to prepare a sample request; no appointment or payment is made.
3. Open Resources from the homepage introduction or footer. Filter categories, read a sample article and try invalid/valid newsletter input. The confirmation explicitly states that signup did not occur.
4. Use Sign in and the demo account shortcuts to open Meadow Studio. Explore Profile, Membership, Inquiries and Q&A. Local changes clear on reload.
5. From the workspace navigation, open Admin overview and select the Administrator shortcut. Review applications/credentials, rename a category label and moderate a sample question or review. Switch accounts to inspect the resulting local member/public states.
6. For a consultation request, open Admin → Consultations, assign an eligible professional, switch to that member and accept/decline coordination. Return through the public Consultations link to inspect status. Booking and payment remain unconnected.

## Client content and decisions still needed

- Final copy/visual approval; company story, film, poster, captions and transcript.
- Approved resource articles, attribution and newsletter content; selected CMS/newsletter provider.
- Confirmed public contact/support details; approved Privacy/Terms wording and disclaimer placement.
- Education provider/program selections, entry requirements, timelines and external costs.
- Credential review and review-verification policies; public identity/contact fields; featured terms and ordering; multi-category billing; consultation delivery, coordination and refund responsibilities.

## Integrations still pending

Server authentication/authorization, ownership checks and RLS; durable shared data; production location/service areas; secure image uploads; CMS editing; billing/subscription and featured purchases; booking/scheduling; transactional email, inquiry and newsletter delivery; production admin analytics/category creation and launch operations. Current session safeguards are demo protections only.

Admin preview currently provides queues, decisions and category-label editing. Full admin profile-editing tools, analytics, category creation and content/featured management still belong to the later production milestones; current counts are not production analytics.

## Verification and blockers

- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build:demo` passed. Unit tests: 89 passed, no skips.
- Browser regressions: 104 distinct affected Chromium cases passed across completed batches, covering ten specs (client preview, homepage/About, education/pricing, profiles, member/admin, Q&A/reviews and consultations/coordination). Four tablet/mobile duplicates were intentionally skipped because explicit viewport tests run once on desktop. This is affected coverage, not a run of every repository browser spec.
- Coverage includes keyboard navigation, validation/focus, empty/missing/invalid states, no-JavaScript/prehydration behavior, public-field boundaries, account ownership, rating publication/rejection/reset and request → admin assignment → member response → public status. Desktop/tablet/mobile screenshots were inspected, including 320px and enlarged text. Review queue wrapping and consultation action wrapping were corrected.
- Browser runs used an isolated saved demo build on ports 3209/3210 via `.codex/client-preview.playwright.config.ts`, with `RHH_E2E_BASE_URL` / `RHH_E2E_ERROR_BASE_URL`. Initial failures were fixed and rerun; local Chromium resource errors passed with one worker. Interrupted runs were not counted as successful checks.
- `npm run build` correctly rejects missing production opt-in. `git diff --check` passed. No real-device, Safari/Firefox/Edge or production performance/security acceptance is claimed.
- Launch blockers remain client content/decisions, real integrations and production acceptance; frontend demo completion does not resolve those requirements.

Generated screenshots and logs are local review artifacts in `output/playwright` and `output/client-preview-*.log`. Confidential source material remains outside public assets.
