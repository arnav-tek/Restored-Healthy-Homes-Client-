# Decisions

Authoritative scope: [overview](../Project%20overview/restored-healthy-homes-project-overview.md) and [alignment](../Project%20overview/client-conversation-alignment.md).

## Confirmed

- Eight categories and individual prices are implemented in `src/domain/categories.ts`. No ninth category or narrowed Health Practitioners label.
- Next.js/Supabase/Stripe/Vercel are accepted. Hosting is resolved.
- Warm reference styling may be refined; exact reproduction is not required. Live reference inspected; no source HTML supplied.
- All formerly deferred features remain in final delivery; milestones only sequence the work.
- Certifications are supplied externally, not issued by this platform.
- Client supplies legal copy; placement is to be agreed. No legal wording invented.
- Progress previews, client review/revisions, owner walkthrough and written admin guide remain commitments. Revision count/support terms are not established.

## Temporary Phase 1 choices

- Read-only server fixtures, no persistence/reset requirement. Reserved example.invalid emails and synthetic billing IDs.
- Public = approved + active + not suspended; no inferred grace periods.
- Member preview uses one shared fictional business. `/demo/member` and `/demo/admin` are not authentication; no mutation actions.
- Native select/GET/details meet the current interaction needs. shadcn deferred rather than adding unused dependencies.
- No stock imagery needed. RHH text treatment follows the reference without commissioning a new logo.
- Explicit optimized-demo mode; live/unknown modes and Vercel production fail closed.
- Security context is supplied by the user's brief: local-only, synthetic, read-only, no external services. No blocking context questions remain; redundant skill check-ins are omitted per user instruction.

## Resolve before dependent implementation

| Decision | Needed by |
| --- | --- |
| Multi-category prices and subscription start/grace/cancellation/reinstatement | Memberships |
| Featured price/duration/placement/subscription relationship | Featured upgrade |
| Review verification/moderation | Reviews |
| Consultation matching, money routing, schedule, refunds/no-shows, phone/video and summaries | Consultations; consult the private authoritative scope for commercial terms |
| Radius, service area and location provider | Search |
| Credential verification and badge rules | Certification workflow |
| Newsletter and transactional provider | Email/content |
| Client text/media/video/legal copy/placement/editing/prototype source | Content and launch |
| Expanded schedule, revision rounds, post-launch support | Delivery planning |

None blocks Phase 1. No combined billing formula or payout system has been invented.
