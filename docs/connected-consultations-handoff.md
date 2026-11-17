# Connected free-phone consultations — 15 November 2026

Independent audit follow-up: [15 November audit](connected-consultations-independent-audit-2026-11-15.md) records the original native form privacy, missing participation editing and stale pagination findings. All three are now corrected in source; see [fixes, applied migration and verification](connected-consultations-fixes-2026-11-15.md). The current staging history has 23 migrations. Live authenticated A/B/admin acceptance remains blocked; original verification below is historical and does not replace the follow-up's evidence boundaries.

Implemented in staging with migration `20261114191924_connected_consultations.sql`. No payments, calendar booking, calling platform or outgoing email. Client's later free-phone revision overrides the original paid-consultation brief.

## Walkthrough

1. `/consultations`: choose a category, enter name/email and a topic. Submit saves a real request. Admin receives contact details; assigned specialists receive the topic/category, never the separate name/email or private note fields. The form warns against putting sensitive details in the topic; text is not automatically anonymized.
2. `/admin/consultations`: current verified database administrators can view requests, assign/reassign opted-in eligible category specialists, save private coordination notes and cancel with confirmation.
3. `/member/consultations`: current confirmed members see only assignments bound to their account and currently owned listing. Accept rechecks participation/category/eligibility; decline returns an assigned request to the unassigned queue. Acceptance does not schedule a call. An accepted request can be reassigned or cancelled by admin.
4. Public status is available from an HttpOnly, SameSite=Strict receipt cookie scoped to `/api/consultations`. Only the latest submitted request is retained in that browser; receipt access expires after 30 days. Clearing cookies or using another browser requires admin help. No contact data or secret receipt appears in URLs. Status refresh and confirmed visitor cancellation survive reload.

## Security and operational boundaries

- Private existing consultations table, RLS, non-login/non-bypass executor and explicit invoker RPC wrappers. No direct client table grants, no service/Storage secret and no user-metadata authority.
- Current confirmed identity/database admin checks, owner-bound assignment, version comparisons, row locks, eligibility checks and server-derived transitions. Admin/member decisions are recorded in a private append-only event ledger.
- Public submission is atomic/idempotent for matching request UUID, capability and content. Retry content changes conflict. Limits: 100 new submissions globally/hour and five per normalized email/day, enforced in the database with keyed email hashes. These are conservative limits, not verified identity or CAPTCHA; repeated requests with fresh keys count against the limits. Final abuse/retention policy needs client approval.
- Token hashes only in the receipt table. No reusable public request-ID lookup. Private/no-store responses, origin checks and bounded JSON input. Visitor mutations require the receipt and current version.
- Event rows are `pending_configuration`; no verified email destination snapshot, notification adapter, dispatcher or scheduler is implemented here. Before sending, separately resolve/revalidate recipients and consent. Do not describe an event as delivered.
- Admin coordinates manually using saved email. No phone number is collected; phone timing/contact exchange occurs outside this request form. Request status is refreshed on demand, not via Realtime.
- Existing requests, accounts, roles and memberships preserved. Legacy assignments without an owner snapshot are not exposed to members until an admin intentionally reassigns them.

## Verification

- Typecheck, lint and demo build passed. Unit suite: 207 passed after correcting a new test environment fixture and updating an obsolete consultation-availability expectation.
- Existing desktop/mobile consultation demo regressions: **14 passed** in a complete single-worker, trace-disabled retry (`output/consultations-e2e-recheck.log`). The initial two-worker run was interrupted after five passes as free disk space dropped below 200 MB; no full pass is claimed for that run. Space recovered after stopping it. These regressions preserve demo behavior and are not live authenticated staging acceptance.
- `node scripts/check-connected-consultations.mjs`: 42 isolated SQL assertions passed, using synthetic A/B/admin identities. Covers retries, forged/missing fields, receipt access, role/private-data isolation, eligibility/opt-out, stale versions, accept/decline/reassignment, notes, cancellation, quotas and session revocation. Uses existing foundation through review migrations plus the consultation migration; not a PostGIS/location acceptance run.
- `node scripts/check-consultations-staging.mjs`: seven real anonymous hosted/local boundary checks passed with no writes.
- Actual browser: submitted a labelled test request through the website, reloaded its saved status, cancelled it, and reloaded the persisted cancellation. Hosted aggregate confirms cancelled/version 2/two events. One labelled `Consultation acceptance test` record remains cancelled, using `consultation-test@example.invalid`; no client record was changed and no email was sent.
- Existing signed-in member browser loaded the empty member workspace and was denied admin access. No populated authenticated admin/member A/B acceptance is claimed.
- Public form inspected at 1440, 768, 390 and 320px with no measured horizontal overflow. Mobile member empty state inspected. Screenshot: `output/playwright/connected-consultations-desktop.jpg`. No new axe scan was run.
- Security advisor: no new warnings; existing leaked-password protection warning remains. Ten intentionally closed-table INFO findings remain. See https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
- A formatter encountered ENOSPC and emptied one newly created component; restored it immediately and reran typecheck/lint successfully. No existing file was restored over user work.

## Remaining acceptance

### Cross-tab cancellation repair — 15 November 2026

Status responses now include the non-secret receipt request UUID after capability verification. Cancellation requires that displayed UUID and the saved version. The HTTP handler rejects a mismatch with the shared cookie (409) before calling Supabase, so tab A cannot cancel request B after tab B replaces the latest-request cookie. Identifier alone grants no access; the existing private capability remains required. Legacy version-only cancellation requests are rejected. Refreshing saved status dismisses the previous confirmation.

The new real-handler regression uses a mocked database transport to model two tabs with different request IDs but identical versions: mismatched cancellation makes zero RPC calls; missing identifiers fail; matching status/cancellation returns the allowlisted ID without leaking the token. Five focused tests, typecheck and lint passed. No migration or hosted records changed; no new live two-tab browser run or full build/suite is claimed for this narrow repair.

Designated admin and member A/B sessions plus disposable eligible opted-in listings are needed to verify populated assignment/acceptance across separate live browsers, actual concurrent decisions, reassignment privacy and revocation. Isolated SQL tests do not replace those checks. Final client coordination/retention policy and real application emails remain pending.

The staging history now includes the independently applied location migration and this consultation migration (22 entries when checked). Location changes were already in progress in the workspace and were not modified as part of this feature. Production launch remains blocked. No deploy, commit or push.
