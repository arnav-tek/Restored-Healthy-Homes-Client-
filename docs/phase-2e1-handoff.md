# Phase 2E-1 handoff

Implemented 2026-10-02. Public demo Q&A browsing and question submission only. Preserve dashboards; stop before Phase 2E-2 and integrations. Local checkpoint `713c45c` preserves completed Phase 2D. No push or deployment.

## Routes and behavior

- `/questions`: ten published fictional questions across all eight existing category IDs, alphabetical title order, six per page. Search matches question title/body/category label; answer text is not searched. Clear filters, counts, empty/correction/unavailable states and pagination are implemented.
- `/questions/[id]`: stable IDs, question content, published sample answers with fictional attribution, unanswered state and filtered-results return. Professional links appear only when the existing public profile eligibility lookup succeeds. Missing/unpublished/session-pending IDs return generic 404s; metadata uses the same guarded loader. No Q&A structured data; demo no-index remains.
- `/questions/ask`: title (10–160 characters), one category and question text (20–2,000). No contact fields. Visible fictional-information guidance, accessible errors and first-error focus. Submission creates a pending question in the shared React session and shows a focused confirmation: awaiting fictional review, not public, not delivered, not permanent. No pending detail link.
- Public navigation includes **Ask a Specialist**. Existing palette/fonts are retained, with a readable list and distinct answer sections. Main navigation collapses below 1050 px to fit the additional entry; dashboard breakpoints are unchanged.

Query contract: `q` ≤120 raw characters, canonical `category` ID, integer `page` 1–10000 (default 1). Repeated/malformed/oversized values produce correction states rather than an unfiltered result. Successful requests strip unknown parameters and canonicalize/clamp pages. Filter submission omits page. `returnTo` accepts only `/questions` with validated filter/page parameters; other paths, origins, fragments, backslashes, controls and duplicates fall back to `/questions`. Draft contents never enter URLs. Shared `SearchForm` now uses Next's GET form navigation with native no-JavaScript fallback, preserving the session during hydrated search navigation.

## Models and boundaries

`src/domain/qa.ts` owns typed question/answer records, moderation states, public models and publication/search selectors. `src/validation/qa.ts` validates submissions, queries and return URLs. `QaRepository` is wired to a server-only demo adapter; unpublished fixtures and moderation notes never enter browser imports or public projections.

Explicit public question fields: ID, title, category ID, body and published answers. Public answers contain ID, body, fictional attribution and an optional eligibility-checked profile link. List summaries contain only ID, title, category ID, excerpt and published answer count. Publication checks precede projection, filtering and counts. Only published answers attached to published questions appear; unlinked fictional attributions do not imply listing eligibility or verification.

The existing reducer/provider owns `questions` and `questionId`; there is no competing store. The submission action revalidates and allowlists fields, generates an ID and forces pending status. Existing draft key `question` retains unfinished input during client navigation. Success clears that draft; confirmed global reset clears all session data/drafts. Refresh/full-document navigation resets them; public server fixtures remain available. Controls are disabled before hydration and without JavaScript; seeded browsing and GET search remain readable without scripts. No persistence, network mutation, content logging or integrations.

## Moderation assumptions and Phase 2E-2 plan

New questions are pending; only published questions/answers are public. Public users have no moderation action. Member-answer eligibility and review policy are not inferred from listing eligibility.

For 2E-2, use the existing session reducer to overlay moderation decisions on a server-projected **public seed snapshot**, keyed by stable IDs, and combine that snapshot with browser-created submissions. Apply the same publication and public-field selectors to the resulting session preview. Do not hydrate private server fixtures into the provider; hidden server fixtures remain boundary tests. Any extra admin demo examples must be purpose-built, nonsensitive synthetic review records, not private adapter records. Session decisions must remain distinct from server-rendered fixture publication. Real persistence and access control require a later server-authorized integration.

Remaining 2E-2 tasks: define answer eligibility; permitted member answer drafting/submission; admin question/answer review, publication/rejection/removal and confirmations; parent/child visibility after decisions; coherent session preview and reset; boundary/journey tests and handoff. No answer/moderation UI or reducer actions were prebuilt in 2E-1. Other client-approved backlog items remain in the checklist.

## Verification and limitations

Checks: typecheck and lint pass; **41 unit tests pass**; optimized demo build passes with the existing process-only 768 MB Node heap cap. Full browser run: **80 pass, one intentional desktop-menu skip** across 1440/768/390 px. Six targeted layout/submission cases also pass after the final mobile count-spacing adjustment and added confirmation/refresh checks. Ordinary build correctly rejects missing demo opt-in. HTML/metadata/RSC/script tests and a generated-browser-asset scan exclude hidden fixture markers and private moderation fields. No submission/storage effects were detected. Desktop/tablet/mobile screenshots (including long titles, empty/errors and confirmation) and the 900 px navigation layout were inspected; tested Q&A screens have no detected axe violations or page overflow. Detailed results are in the checklist. Screenshots: `output/playwright/phase-2e1-*`.

Demo content is neutral service-planning material, not clinical advice or endorsements. Session state is not authorization or persistence. Chromium emulation does not cover physical devices, Safari/Firefox or a full accessibility audit.

Preview: `npm run dev`, then `/questions`, `/questions/planning-inspection` or `/questions/ask` on `http://127.0.0.1:3000`. Optimized preview: `npm run build:demo`, then `npm run preview`. This host may use the existing process-only 768 MB Node heap cap. Production stays blocked without explicit demo opt-in.
