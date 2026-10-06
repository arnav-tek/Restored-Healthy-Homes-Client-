# Phase 2F-1 handoff

Implemented 2026-10-03. Public consultation page and tab-session request demo only. Stop before 2F-2 member/admin consultation management. No push, deployment or integrations.

## Routes and behavior

- `/consultations`: server-rendered introduction, proposed **$50 USD / 15 minutes** offer pending client confirmation, intended request → coordination → confirmation process, directory link and an interactive request form at `#request`.
- Main navigation/footer now include Consultations. One modest homepage teaser links to it. The navigation-only collapse breakpoint is 1180 px; existing directory/dashboard layout breakpoints remain unchanged.
- Fields: fictional name (2–100), email (up to 254 with the existing project email syntax), one stable category ID, `phone | video | no-preference`, and plain-text topic (20–2,000). Inputs are trimmed; text maximums bound raw input as in existing forms. Unknown fields are ignored, invalid types/enums rejected, and accepted fields are explicitly projected.
- Inline errors, first-invalid-field focus, disabled prehydration/no-JavaScript controls, draft preservation and focused “Demo request recorded” confirmation. Confirmation shows category, format and offer; it does not echo name/email/topic or put them into URLs. It explicitly says no appointment, specialist assignment, payment or message exists. “Make another demo request” starts a deliberate new attempt.

## Shared state and boundaries

The existing provider/reducer owns `consultations: readonly DemoConsultationRequest[]` and `consultationId: string | null`; there is no second store. `request-consultation` revalidates five fields and constructs the record with a stable revision-based session ID, `status: requested`, separate `paymentStatus: not-collected`, `providerId: null` and `scheduledAt: null`. Offer amount/currency/duration come only from `src/domain/consultation.ts` (amount in cents), never form input. Each record keeps its configuration snapshot.

A non-null latest ID blocks duplicate submit actions until `new-consultation`; deliberately making another keeps earlier records in the session. Draft key `consultation` is cleared on success. Global confirmed reset clears every request and draft; refresh/full-document navigation creates an empty session. No permanent storage, browser storage, endpoints, network mutations, content logging, payments or scheduling. Request contents never enter public directory/Q&A projections, server seeds, metadata or structured data. Demo controls provide no production authorization. Existing no-index and production guard remain.

## Verification

Typecheck, lint, 49 unit tests and optimized demo build passed. The browser suite's 101 applicable cases passed across completed runs, with one intentional desktop-menu skip. Two existing Q&A tests initially raced navigation; destination assertions fixed them, and affected/unrun cases were completed in targeted runs. This was not one uninterrupted passing suite run. Demo builds use the existing process-only 768 MB Node heap cap; no dependencies or permanent configuration changes. Default `npm run build` correctly rejects missing demo opt-in.

New unit/browser coverage includes validation bounds and all categories/formats, forced request/offer fields, duplicate protection, stable IDs, shared state isolation, draft navigation, confirmation, deliberate additional requests, cancelled/confirmed reset, refresh, no network mutations/browser storage, no-index and disabled no-JavaScript/prehydration submission. Desktop/tablet/mobile (1440/768/390 px) consultation and homepage screenshots were inspected, including validation and confirmation; desktop navigation also checked at 1181/1100 px. No detected axe violations, overflow or page errors in consultation journeys. Screenshots are in `output/playwright/phase-2f1-*`; physical devices, Safari/Firefox and a full accessibility audit remain unverified. Focused code review and `git diff --check` passed.

## Client decisions and next phase

Confirm the offer, specialist selection/matching, payment recipient, scheduling/availability, phone/video delivery responsibilities, whether a written summary is included and who supplies it, plus cancellation/refund/no-show rules. The preview guarantees none of these and makes no clinical-service or outcome claims.

2F-2 should consume the shared `consultations` array by stable ID, using the validated request fields and configuration snapshot. Keep request lifecycle separate from payment; add only newly authorized transitions. No member/admin consultation queues or actions were started here. Real auth, ownership/RLS, persistence, payment, delivery and abuse/security testing remain later work. The fuller homepage pass, client-supplied About Us story/text/video and all other approved backlog features remain in the checklist.
