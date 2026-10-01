# Phase 2D handoff

Implemented 2026-10-01. Dashboard presentation/navigation only; existing demo workflows and business rules are preserved. Stop before integrations or another phase. Remaining approved features stay in `docs/build-checklist.md`.

## Views and navigation

- Member: **Overview** (status, eligibility, next steps and shortcuts), **Profile** (permitted edits and saved public-content preview), **Inquiries** (separately seeded fictional inbox/empty state), **Membership** (read-only status and individual category prices).
- Admin: **Overview** (counts derived from current records and working shortcuts), **Applications** (filters, selected application details and approval/rejection), **Listings** (independent eligibility states, suspension/reinstatement and the session directory), **Credentials** (individual claim review), **Categories** (display-label editing).
- Desktop uses a sticky navigation rail; below 820 px, a native disclosure provides section navigation. The other demo workspace is a separate link, not a role/authorization switch. Tables scroll within their own region. Existing palette, fonts, no-index conventions and public directory are unchanged.
- Entry routes remain `/demo/member` and `/demo/admin`. Validated parameters: `section` from the area's allowlist (default `overview`); `record` as a bounded demo ID; admin `q` (up to 120 characters), `status` (`pending`, `approved`, `rejected`, default all), `suspension` (`suspended`, `clear`, default all), and `category` (canonical ID for the category editor). Repeated/unknown/oversized values fall back safely. Unknown session records show a useful fallback/empty state. Links encode canonical internal destinations only.
- Example: `/demo/admin?section=applications&status=pending`. Opening a row adds `record`; **Back to applications/listings/credentials** removes only that selection and preserves filters. Section links retain filter/category selection. Browser back/forward restores the URL view; reload retains its URL but resets demo data.

## Component and state decisions

The existing reducer remains the accepted-record writer. The only added domain selector derives overview counts. Shared eligibility, member allowlists, credential identity/review, category validation and explicit public projections remain intact. Approval never activates a subscription or clears suspension; reinstatement cannot override subscription eligibility.

The existing root session provider also holds transient form drafts keyed by purpose and record/category ID. Profile fields, decision reasons/actions, category labels and unapplied admin filters survive client navigation and record switches. Drafts do not affect accepted records, applied filters or public previews until submission. Saving/applying clears the corresponding draft. Filter and record/category controls disable during their URL transition so rapid interactions cannot overwrite the destination's form. Reset asks for confirmation, clears accepted changes and drafts together, and returns the current dashboard to its overview. Refresh/full-page navigation still discards everything; a concise visible notice explains this.

`DashboardShell` owns grouped navigation and secondary reset; `RecordStatus` keeps approval/subscription/suspension/eligibility together. `RecordRegister` handles shared admin lists. A single `DecisionForm` composes application or listing decisions; credential controls and category controls each have one implementation. Native confirmations still identify the business/claim for rejection, suspension and verification removal. Nearby live feedback receives focus after actions; section/record navigation focuses the page heading.

No browser storage, network mutations, logging of form contents, real auth/database/payments/email/uploads, or new dependencies. All mutation controls remain disabled before hydration/without JavaScript. Demo workspace links and readable sample content still work without scripts, with full-page navigation resetting state.

## Verification and checkpoint

Git was clean at the start. Saved local checkpoint commit `381651d` using the configured identity before editing. No push or deployment was performed. Actual checks and visual-review results are recorded in the Phase 2D verification section of the checklist. Screenshots use `output/playwright/phase-2d-*`.

Final checks: typecheck and lint pass; 35 unit tests pass; optimized demo build passes with the existing process-only 768 MB Node heap cap. Full single-worker browser run: **65 pass, one intentional desktop-menu skip** across 1440/768/390 px. URL history, drafts, reset cancellation, protected workflow regressions, no-JavaScript guards and no submission/storage effects pass. Desktop/tablet/mobile screenshots were inspected, including long names, empty/error/confirmation states; tested screens report no axe violations or page overflow. Ordinary `npm run build` correctly rejects missing demo opt-in. Browser testing caught and fixed a wrapped-link hit area and a rapid filter-navigation race before the final full run.

## Limitations and remaining work

Drafts are temporary React memory, not persistence or an audit trail. Unsaved drafts survive client navigation only. The session directory intentionally has no real publication or profile routes; public directory fixtures remain separate. Counts describe fictional session records, not platform statistics. Inquiries remain independent fixtures, with no delivery.

Chromium emulation and axe checks do not replace physical-device/Safari/Firefox testing or a full accessibility audit. All real integrations and later scope (reviews, Q&A, consultations, featured billing, resources/CMS/newsletter/About Us and launch) remain in the backlog.

Local preview: `npm run dev`, then open `http://127.0.0.1:3000/demo/member` or `/demo/admin`. For optimized preview: `npm run build:demo`, then `npm run preview`. On this memory-constrained host, the process-only `NODE_OPTIONS=--max-old-space-size=768` workaround remains available. Production builds remain blocked without demo opt-in.
