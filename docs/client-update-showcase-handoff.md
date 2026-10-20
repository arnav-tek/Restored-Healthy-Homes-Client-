# Client-update showcase handoff — 2026-10-20

## Scope and behavior

The user requested the client's revisions and an account/application showcase, then explicitly deferred Supabase and email. Existing React memory remains the only state source. No backend packages, database, authentication service, browser storage, email, payment, uploads or geolocation integration was added. The production guard and no-index conventions remain.

Homepage copy/order, specialty description removal, featured description removal, public labels, Certifications intro layout and pricing consultation removal are implemented. Profiles use a tighter two-column desktop heading with the image slot on the right and a city-level Google Maps link; they stack on mobile. No exact fictional business location or blanket certification claim is invented.

The free phone offer replaces the old paid-consultation baseline. Only opted-in approved/active/unsuspended specialists in the requested category can be assigned or accept. Members control their own demo preference; this cannot change approval, billing, suspension or credential decisions. Public fixtures explicitly mark participant IDs; local member edits do not claim to update that server-rendered directory. Timing/duration are provisional and no appointment is booked.

Questions reach a published-only, category-matched member inbox after admin review. No email is sent. The first submitted eligible response gets publication priority, with admin moderation retained; later responses can be considered after rejection. This policy needs client approval before a real integration. No private contact fields enter the public question/answer projection.

Sample JPEG/PNG/WebP previews validate type, file signature, byte size (3 MB) and decoded dimensions (4096px maximum). They remain in memory drafts, are never uploaded/published, and clear on sign-out/reset/reload. Account switching does not inherit them. Existing safe return handling, pending/rejected/inactive states and independent eligibility remain.

## Client walkthrough

Open `/demo/walkthrough` (linked from sign-in and the application). Use fictional information:

1. Submit List Your Business; inspect pending/inactive/unverified status.
2. Use Your submitted application in sign-in Quick access. Edit profile, try a sample photo and choose free-phone participation.
3. Switch explicitly to Administrator to approve/reject. Approval does not activate membership or publish an inactive application.
4. Submit a Healthy Home Builders question; publish as admin. Sign in as Hearthside Building Co. (`builder@example.invalid`, displayed public passcode) to see its category inbox and answer. Admin publishes the first response; the public question shows business attribution without the account email.
5. Submit a Healthy Home Builders consultation request; assign Hearthside as admin, then accept/decline as Hearthside. Opt out through its Profile section to test assignment/acceptance restrictions.

Submitted demo records survive sign-out in this tab; drafts/photos clear. Refresh or confirmed reset clears the complete session. Each step works without genuine accounts. Client edits are previews, not production route protection.

## Remaining work and source

`docs/remaining-scope-report.md` compares the authoritative functional overview/alignment with the new client list, separating demo behavior, real integrations and client decisions. It preserves every approved final feature. Official Google Maps URL syntax: https://developers.google.com/maps/documentation/urls/get-started (city-only search, no API key required). Embedded maps await confirmed public place data; typography/colors/media await supplied choices. The client copy is adapted where it would otherwise promise universal certification or actual delivery/booking.

## Verification

- `npm run typecheck`, `npm run lint` and `npm test`: passed (92 unit tests).
- `npm run build:demo`: passed against the final source. Default `npm run build` rejected missing demo opt-in with exit 1: “Production is blocked.”
- `npm run test:e2e`: exercised all 225 desktop/tablet/mobile cases. All 216 runnable scenarios passed across the full runs and targeted corrections; 9 intentional viewport-specific skips remain. Initial failures included outdated labels/counts, first-answer re-approval and a streamed-title audit race. The audit now asserts the expected title before running the unchanged accessibility checks.
- Final affected regression run: 12/12 passed across all three viewports, including photo isolation/no submission, revised homepage layout, category inbox publication, answer history after changing categories, and workspace accessibility. No remaining test failures. Logs are under ignored `output/showcase-*.log`.
- Reviewed actual desktop/tablet/mobile renders and 320px reflow. A tablet-only featured-header flex basis caused excessive blank space; corrected and checked at 1024, 768, 390 and 320px. Local member controls reuse the existing palette and spacing.
- `git diff --check`: passed. No dependencies added. The initial showcase was prepared locally without a push or deployment. Follow-up: the user requested a GitHub push and the two plain-language reports in `updates/`; see Git history for source revisions. A new Vercel deployment is not part of this follow-up.
