# Phase 2F-2 handoff

Implemented 2026-10-03; verification finalized 2026-10-04. Session-only member/admin consultation coordination. Stop before another phase or real integrations; no push or deployment.

## Routes and query contract

Existing `/demo/admin?section=consultations` provides counts, filters, list and detail; `/demo/member?section=consultations` shows the selected member's assignments. `consultation=demo-consultation-<positive revision>` opens a session detail. Missing/unowned IDs show a generic unavailable state. `consultationStatus=requested|assigned|accepted|cancelled` filters both lists; admin also supports `assignment=assigned|unassigned` and stable `category` IDs. Invalid/duplicate values default safely. Member `record` selection follows existing dashboard navigation; it is not authentication. Detail/back navigation preserves filters. No visitor name, email, topic or note enters generated URLs.

Public `/consultations` retains the latest request confirmation and reflects its current status on return. It has no public request-detail route. Another request preserves earlier records for dashboard management.

## Rules and state

`src/domain/consultation-session.ts` centralizes transitions and projections over the existing provider's consultations array. Provisional rules require client confirmation: admin manually chooses an approved member with an active subscription, no suspension and the requested category. Assignment and acceptance both recheck these conditions. Acceptance derives the actor from shared selected-member state, never a form identity. Later eligibility/category changes retain the assignment, display admin attention and block acceptance; they never reroute or cancel it.

| Action | Result |
| --- | --- |
| Assign requested / reassign assigned | Assigned; selected eligible provider awaits response |
| Unassign assigned | Requested; provider cleared |
| Member accepts own assigned request | Accepted for demo coordination |
| Member declines own assigned request | Requested; provider cleared; disappears from their assignments |
| Reassign / unassign accepted | Requires confirmation; becomes assigned / requested respectively |
| Cancel any open request | Requires confirmation; becomes cancelled; existing provider retained for closed-record visibility |

Cancelled requests cannot be reopened or reassigned. Optional admin notes may still be updated. Invalid IDs, ownership, eligibility and transitions are no-ops; identical actions are harmless. Allowlisted updates preserve the visitor fields, stable ID and original offer snapshot. Payment stays `not-collected`, scheduling stays null. No appointment, notification or payment occurs.

Notes are trimmed plain text, bounded to 500 characters; drafts use `consultation-note:<request-id>`. Shared confirmed reset clears requests, assignments, statuses, notes and all drafts; refresh/full-document navigation recreates original fixtures. No second store or persistence was added. One purpose-built eligible alternative designer, `member-example-coordinator` (Willow Sample Studio), enables reassignment. Existing IDs are unchanged; initial member count is five, eligible count two, unverified credential count still four. Public server directory fixtures are unchanged.

## Projections and boundaries

Public summary allowlist: ID, category, format, offer, status and not-collected payment. Member projection adds only fictional topic and a derived attention flag, restricted to the selected member's assignments. Neither includes visitor name/email, provider identity or internal note. Admin detail alone renders the complete fictional request and note editor. Contact-sharing policy is unresolved. All text renders as plain text; synthetic session data is not production authorization.

Disabled prehydration/no-JavaScript controls and existing no-index/production guard remain. There are no storage APIs, network mutation endpoints, content logging, real authentication, payments, email, calendar or video integrations. No completion/no-show/refund/payout controls were added.

## Verification

- `npm run typecheck`, `npm run lint`, 56 unit tests and `npm run build:demo` passed. Final changed test/page files also passed focused lint. Demo builds used the existing process-only 768 MB Node heap cap; no dependency/configuration changes.
- All 113 applicable browser cases passed across completed runs, with one intentional desktop-menu skip. This was not one uninterrupted full passing run: earlier dashboard tests assumed one eligible fixture; count assertions and one ambiguous listing selector were corrected, then failed/unrun cases completed. All 76 tablet/mobile cases passed together. Final consultation styling and copy were rebuilt and affected desktop journeys/screenshots repeated.
- Unit coverage includes lifecycle/confirmation guards, all eligibility combinations, category matching, selected-member ownership, duplicate actions, protected values, stable IDs, exact projections, note bounds, URL validation, reset and isolation. Browser coverage includes request → assignment → acceptance → public status, accepted unassignment/reassignment/cancellation and dismissed dialogs, decline, suspension attention, unowned/missing requests, filters/history, note drafts, another request, refresh/reset, no-script/prehydration controls and absence of mutation requests/browser storage.
- Actual desktop/tablet/mobile screenshots (1440/768/390 px) reviewed in `output/playwright/phase-2f2-*`: admin detail/list, member accepted/attention states and public confirmation. No detected axe violations, horizontal overflow or browser errors in consultation journeys. Physical devices, Safari/Firefox and a full accessibility audit remain unverified.
- Default `npm run build` correctly rejects missing demo opt-in. Focused code review found no new storage, network or logging side effects; `git diff --check` passed. Expected injected adapter-error logs in regression tests contain no submitted content.

## Remaining work and decisions

Confirm provisional assignment/decline/reassignment/cancellation policy, contact sharing, offer, matching, payment recipient, availability/scheduling, phone/video responsibilities, any written summary, cancellations/refunds/no-shows and notifications. Real services need server authentication, ownership/authorization, persistence/RLS, transaction/idempotency controls, payment integration and renewed privacy/security testing. No next phase is started. Fuller homepage, client-supplied About Us story/text/video and every other approved backlog feature remain in the checklist.
