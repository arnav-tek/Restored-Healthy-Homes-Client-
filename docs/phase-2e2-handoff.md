# Phase 2E-2 handoff

Implemented 2026-10-02; verification finalized 2026-10-03: demo member answers and admin Q&A moderation. Stop before another phase or integrations. No push or deployment.

## Behavior and routes

- `/demo/member?section=qa`: published questions, keyword/category filters, question detail and published answers, validated answer submission and the selected member’s pending/published/rejected answer history. Drafts are keyed by member and question; submission clears only that draft, confirmed global reset clears all drafts.
- `/demo/admin?section=qa`: separate question/answer queues, keyword/category/publication filters, full question/author/parent context, explicit Publish/Reject actions, optional internal notes and focused feedback. Rejecting published content requires confirmation. No bulk actions, notifications, editing/deleting submitted answers or permanent deletion.
- `/questions` and `/questions/[id]`: session publication immediately changes content, counts and pagination. Question and answer statuses remain independent; both must be published for an answer to appear. Hiding a parent preserves each answer’s status. Repeated identical decisions and invalid actions do not change state.
- `/questions/ask` retains its form and pending confirmation; revisiting the confirmation reflects the current session decision and offers a public link only when published.

Dashboard queries extend the existing validated contract with `section=qa`, `question`, `answer`, `queue=questions|answers` and `qaStatus=pending|published|rejected` (default all). IDs permit bounded lowercase letters, numbers and hyphens. Existing `record`, `q` (120 characters) and canonical `category` filters remain; invalid/duplicate dashboard values fall back safely. Public search and restricted `/questions` return URLs retain the 2E-1 contract. Public page count is clamped in the hydrated session, allowing newly published questions to create pages beyond the server fixture count. Without JavaScript the seed results are still clamped and readable.

## Provisional policy

Answering requires approved membership, active subscription and no suspension, enforced in both the UI and reducer by `canMemberAnswer`/`answerSubmissionError`. This policy needs client confirmation. Certification and category matching do not grant or restrict answering in this demo. Author ID and attribution come from the selected session member, never submitted form fields; new answers always start pending.

Answers are trimmed plain text, 20–3,000 characters; internal notes are optional, at most 500 trimmed characters. HTML-looking text renders as text. One submitted answer per member/question is allowed until reset, including rejected answers; this provisional duplicate-prevention choice needs confirmation alongside future revision/resubmission policy. Existing published answers are governed by moderation and parent publication, not automatically retracted when member eligibility later changes. Session-member answers have fictional attribution without a fabricated public profile link. Server-seed links retain the existing eligibility lookup.

## Session and privacy boundaries

The existing root provider/reducer owns all state. A server-only adapter supplies an explicitly projected public seed snapshot; session questions/answers and stable-ID decision maps overlay it. `projectQaContent` gates parent/answer publication and allowlists fields before public searching/counting/paging. Public answers contain only ID, body, attribution and an optional eligible profile link. Member answer history excludes moderation notes and other authors’ answers. No private server Q&A fixture is imported by clients or supplied to the provider; admin queues contain published public seeds plus browser-created synthetic submissions.

`demo-session-question-<positive integer>` routes deliberately return neutral HTTP 200 HTML and generic no-index metadata before hydration. The client then displays only a published record present in that tab, otherwise a truthful unavailable state. Missing/private server seed routes remain generic 404s. Server HTML, metadata and no-JavaScript views know only published server fixtures, so tab decisions do not alter server metadata. No fictional review/Q&A structured data is published.

Refresh/full-document navigation discards submissions, decisions and drafts; confirmed reset restores the original public/member fixtures. No browser storage, submission endpoint, content logging, network mutation, authentication or external integration. Demo workspace navigation and member selection are not authorization. Native mutation controls are disabled before hydration and without JavaScript.

## Verification

Typecheck, lint (zero warnings), **45 unit tests** and optimized demo build passed. **92 applicable browser cases passed across the completed runs**, with one intentional desktop-menu skip. The full run passed all desktop and earlier tablet regressions before a new test navigation race stopped it; corrected Q&A tests passed on tablet/mobile (8), and the remaining Q&A/search regressions (18) and mobile dashboard/profile/application regressions (18) passed. These are combined results, not a claim of one uninterrupted full run. Tests now await destination content before browser history/menu actions.

Coverage includes the complete same-session publication/hiding/reset journey, eligibility/author identity, bounds/forced pending, independent statuses, public allowlists, duplicate actions/stable IDs, isolated drafts, filtered navigation, third-page session pagination, neutral session-route HTML, private direct-route exclusions, no-JavaScript guards, refresh reset and absence of network mutations/browser storage. Private Q&A fixture markers are absent from generated browser assets. Desktop/tablet/mobile screenshots in `output/playwright/phase-2e2-*` were inspected; tested views have no detected axe violations, overflow or page errors.

Ordinary `npm run build` correctly rejects missing demo opt-in. The demo build used the existing process-only 768 MB Node heap cap; no dependency or permanent configuration changes. Chromium emulation and automated accessibility checks do not cover physical devices, Safari/Firefox or a complete accessibility audit. No unresolved blockers.

## Remaining work

Confirm answer eligibility, duplicate/revision/resubmission and eligibility-change policies with the client. Real integration needs server authentication/role and ownership enforcement, RLS, durable records, transactional moderation/idempotency, protected notes, abuse controls, audit trails and renewed boundary/security tests. Matching, notifications and all other approved features remain in the checklist. No next-phase work started.
