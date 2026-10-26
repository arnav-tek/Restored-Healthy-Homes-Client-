# Connected demo workflows — 24 October 2026

The existing design and homepage edits are preserved. Accepted records now drive the connected same-tab walkthrough; unsaved drafts remain separate. Supabase, real authentication, Stripe, email, durable storage and deployment are still deferred.

## What is connected

- A typed, explicitly allowlisted public snapshot initializes linked fictional records. Shared selectors combine accepted linked records, the submitted application and unlinked public examples without duplicate listings. Only approved + active + unsuspended records are public. Membership recovery cannot override rejection/suspension; featured entitlement stays separate.
- Directory results/filters/sorts/pages, full profiles, featured examples, homepage counts/ratings, reviewed/submitted credentials, free-call flags, review eligibility and Q&A profile links use the accepted session state. Changed credential claims lose previous review status.
- Accepted category labels reach public and workspace views. Added specialties appear where supported, including homepage browse/search and pricing; their prices are marked provisional. Stable IDs, associations, billing keys and base rates are preserved. Combined-category pricing is not invented.
- Published applications support their own profile, reviews through admin moderation, member review visibility and linked moderated Q&A answers.
- Validated fictional inquiries retain their professional/recipient privately and appear only in that member's inbox. They survive navigation/account switches and clear on reset/reload. No email is sent. Unlinked public samples explain that their forms only validate; they never deliver to another account.
- Validated photos remain drafts until explicitly saved. Saved replacement/removal affects the owning profile and survives switching; drafts clear on switching. Reset/reload clears all accepted session media. Object URLs contain no encoded image data and are revoked on replacement/unmount. No upload or browser storage is used.
- Resource entrances freeze their current visual position through pointer activation, then release after the click target is established. Mouse/touch/keyboard activation retains motion and static/reduced-motion fallbacks. Featured copy describes fictional examples.

## Short client walkthrough

1. Open the homepage, browse a specialty and view Fern & Field Inspections. Note its rating, credential and free-phone-call presentation.
2. Use demo sign-in, the workspace navigation and Administrator shortcut. Suspend Fern under Listings. Follow its public-profile link, directory and homepage: it is unavailable everywhere. Try payment recovery as Fern; suspension still applies. Reinstate it as admin.
3. Rename a category or add a provisional specialty under Admin → Categories. Inspect homepage search/browse, directory, Pricing and Certifications. As Fern, edit/save the profile, change a credential and opt out of free calls; compare public results and assignment eligibility.
4. Submit a fictional business application. Approve it and activate its simulated membership as admin. Optional featured entitlement changes homepage placement independently. Inspect updated counts, submit/publish a fictional review, then use Your submitted application to view it and submit a Q&A response for admin review.
5. From Fern's public profile, submit a fictional inquiry. Open Meadow's inbox, then Fern's: only Fern receives it. No email is sent. Choose a sample photo as Fern, view the public profile before saving, then save/replace/remove it and compare. Switching accounts clears unsaved drafts.
6. Open Resources with normal motion and use mouse, touch or keyboard to enter an article. Reset/reload the demo to restore its initial examples and clear accepted changes.

## Intentional limitations and pending work

- One submitted-application walkthrough is available per tab. Existing unlinked sample accounts do not gain an invented public-profile association; their saved photos remain workspace-only. Existing public examples without an account keep their public presentation and validation-only inquiry explanation.
- The reviewer must navigate within the same tab. Reload, a fresh tab or reset restores initial data. Browser roles/ownership checks simulate workflows only; production still needs server authentication/authorization, ownership checks and database/storage policies.
- Consultations are free phone requests for eligible, opted-in specialists in the requested category. Assignment/acceptance is not a scheduled call or notification. Q&A still needs moderation and follows the existing first-response rule.
- Newsletter stays explicitly validation-only; it subscribes nobody. No new paid featured price or directory-ranking policy was added.
- Final company/editorial assets, legal/contact content, credential/review/answer publication policies, billing terms and production integrations still require their separate approvals and implementation.

## Verification

- Typecheck and zero-warning lint passed, including a final pass after browser-test fixes. All 126 unit tests passed.
- Demo build passed from an isolated source copy at `output/connected-runtime`; the default production build correctly rejected missing production opt-in.
- Affected Chromium browser regressions verified **163 distinct passing cases**, with **8 intentional skips**, across completed runs and corrected-test reruns:

  | Coverage | Passed | Skipped |
  | --- | ---: | ---: |
  | New connected workflows, including photo isolation and resource activation | 18 | 0 |
  | Admin completion/showcase, public application and featured/billing | 44 | 4 |
  | Search, directory ratings and public profiles | 38 | 4 |
  | Q&A/review moderation and consultation assignment, acceptance, reassignment and cancellation | 21 | 0 |
  | Scroll motion, keyboard focus, reduced-motion and static fallbacks | 42 | 0 |

- Actual desktop/tablet/mobile and 320px screenshots were inspected, including saved profile photos, category/pricing changes and inboxes. Affected tests cover unavailable/invalid profiles, empty/error states, form validation, keyboard use, overflow, accepted rating updates and reset/reload behavior.
- These results are selected regressions across runs, not a new uninterrupted full-suite or production acceptance claim. A two-worker search run exhausted local Windows/browser memory and is excluded; subsequent runs used one worker and bounded Node heaps. Test corrections addressed stale copy and navigation/hydration readiness. Firefox, WebKit, Edge and physical devices were not rerun for this change.
- Dedicated browser ports: 3225 (normal) and 3226 (adapter-error scenario). Config/artifacts: `.codex/connected-workflows.playwright.config.ts`, `output/playwright/connected-results`, `output/playwright/connected-*`, `output/connected-*.log`. Existing previews/processes are not stopped.

For local review of the tested build: `npm run preview --prefix output/connected-runtime -- --port 3225`, then open <http://127.0.0.1:3225>. The isolated copy is an ignored verification artifact; source files in the project remain authoritative. Generated `output/` artifacts are excluded from TypeScript source checking.

No deployment, commit or push is performed by this task.
