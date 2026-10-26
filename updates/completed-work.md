# What has been completed

26 October showcase-fix follow-up: fixed the admin Q&A queue/filter race, restored the health-practitioner hero wording, added concise fictional-account/review/statistic labels, removed text fading when Certifications panels open, and supplied an icon using the existing RHH mark. The hero retains no playback controls: it plays one introduction of at most 4.5 seconds, then stays still. The owner guide now describes accepted public profile/category/photo changes correctly. Verification and publication status are recorded in [the fix handoff](../docs/client-showcase-fixes-handoff.md).

26 October publishing update: the connected-workflow follow-up now applies accepted demo records consistently across public listings, profiles, homepage counts, categories and eligibility. Linked profile inquiries reach the correct member inbox in this tab; saved sample photos appear on the owning profile. Eligible submitted applications support reviews and Q&A attribution. These changes remain memory-only and reset on reload. See the [connected-workflow handoff](../docs/connected-workflows-handoff.md) for the actual checks and limitations; the older dated verification entries below describe earlier runs. GitHub/Vercel publication is being verified separately.

24 October spacing follow-up: balanced the homepage section gaps, added breathing room below the hero and aligned heading-to-card spacing across desktop, tablet and mobile. The screenshot follow-up increases the gap above How it works to 96px on desktop, 80px on tablet and 56px on mobile. Details and checks are in the [homepage handoff](../docs/homepage-motion-handoff.md#responsive-homepage-spacing--24-october-2026).

24 October scroll-motion update: expanded homepage section/card entrances and added coordinated scroll animations across the other public pages. Motion stays optional, text stays visible, and forms/workspaces remain steady. See the [scroll-motion handoff](../docs/scroll-motion-handoff.md) for coverage and verification.

23 October hero update: removed the footage label and all video controls, including the circular icon requested in the follow-up. Automatic playback, first-frame fallback and static reduced-motion/data-saving behavior remain; the same placeholder clip uses a compatible MP4 encoding at 962,805 bytes (68% smaller). See the [motion handoff](../docs/homepage-motion-handoff.md).

23 October: linked admin featured controls now update homepage cards in this tab. Member billing screens demonstrate checkout, failed payments, recovery and cancellation without card details or money. Eligibility, approval, suspension, credentials and featured entitlement remain independent. See the [featured/billing handoff](../docs/featured-billing-demo-handoff.md).

Public-listing follow-up: an approved, active, unsuspended submitted application now joins public directory search and a full profile in the same tab. Private contacts/notes stay excluded; refresh/reset clears it. See the [journey handoff](../docs/public-listing-journey-handoff.md). Real shared records and integrations remain outstanding.

Updated: 22 October 2026

Quality follow-up: removed a duplicate hero-image download, corrected sample-photo removal/reselection and keyboard focus, fixed typed analytics months in Firefox, and made the skip link keyboard reachable in WebKit. Added a repeatable browser compatibility matrix, mobile performance measurements, an [owner walkthrough](../docs/admin-guide.md) and [client acceptance checklist](../docs/client-acceptance-checklist.md). Actual verification is recorded in the [quality handoff](../docs/quality-audit-handoff.md).

Latest verification: typecheck, lint, 106 unit tests and demo build passed. All 268 applicable Chromium scenarios and 66 applicable Firefox/WebKit/Edge matrix scenarios were verified across completed runs and targeted corrections; intentional skips and initial failures are detailed in the handoff. Desktop/tablet/mobile screenshots were reviewed. The static homepage avoids one 88,265-byte duplicate image request. Local timing samples do not verify production speed or physical devices.

Latest addition: the [admin completion follow-up](../docs/admin-completion-handoff.md) adds category creation, certification editing, separate public identity fields and published Resources/Certifications views in this tab. This extends profile editing, membership/featured scenarios, resource drafts, activity and analytics from the first admin round. Real accounts and integrations remain deferred.

**Current stage: a working prototype for client review. The real, connected platform is not finished.**

This report compares the original client Word brief, the later project overview/client confirmations, the latest website change list, and the implemented project. Later client decisions take precedence over the older brief. It describes the current source code; the hosted website may show an earlier version until its deployment is checked separately.

“Working demo” below means the client can try the flow using fictional information in one browser tab. Refresh clears submitted demo records and account identity. Signing out clears drafts but keeps submitted records for the same-tab walkthrough. Nothing is emailed, charged or saved permanently.

See [what remains and what is needed](remaining-work.md) for the work required before launch.

## 1. Website pages and public browsing

| Area                    | What is available now                                                                                                                                                                   | Completion limit                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Homepage                | Two-column desktop hero, city/ZIP/category search, eight specialty links, About introduction, ways to get started, featured examples, review process and specialist application section | Uses fictional businesses and calculated demo statistics                                                             |
| Site design/navigation  | Existing sage, cream and clay palette, Georgia/Arial typography, rounded section labels without right-hand lines, working navigation/footer and responsive menus                        | Replacement brand assets and final client visual approval remain pending                                             |
| Find Specialists        | Keyword, category, city/ZIP, state, rating and optional radius filters; alphabetical/nearest sorting, counts, pagination and clear filters                                              | Location matching uses a small documented demo dataset; distances are approximate                                    |
| Search navigation       | Filters stay in the URL, survive reload/back/forward and are preserved when returning from profiles                                                                                     | Reload resets fictional workflow records, not the URL search filters                                                 |
| Specialist profiles     | Stable profile routes, business/category/location, description, services, service area, listed/reviewed credentials, available sample contacts and reviews                              | Opt-in public name/email work in linked tab previews; durable records, real images and approved contacts remain                         |
| Profile layout/location | Tighter spacing, photo slot on the right on desktop, mobile stacking and an on-demand Google Maps city preview with a direct-link fallback                                              | City-level demo only; exact business-location pins need confirmed addresses                                          |
| About Us                | Dedicated responsive page with company-story/purpose and video areas                                                                                                                    | Final story, approved copy and client-supplied video are not complete                                                |
| Certifications          | All eight category pathways, training/license distinctions, external-provider references and application links                                                                          | Final selected programs, requirements, timelines and costs still need approval; the platform does not certify people |
| Membership pricing      | All eight confirmed monthly USD category prices, application links and approval/membership explanations                                                                                 | Display only; there is no checkout or payment collection                                                             |
| Resources/blog | Sample public articles/filtering/pages plus resource drafting/review and published session list/detail views | Final content, durable editing and server-checked publication remain unfinished |
| Newsletter              | Email validation and an honest preview confirmation                                                                                                                                     | Does not subscribe, save an email or send a campaign                                                                 |
| Contact/legal pages     | Navigation, page layouts and pending-content explanations                                                                                                                               | Final public details, Privacy/Terms and supplied disclaimers remain unfinished                                       |

### Confirmed membership prices displayed

| Category                                                      | USD per month |
| ------------------------------------------------------------- | ------------: |
| Mold Testing / Inspectors                                     |           $79 |
| Mold Remediation                                              |          $129 |
| Healthy Home Renovations                                      |          $129 |
| Healthy Home Builders                                         |          $200 |
| Healthy Home Trades                                           |          $129 |
| Healthy Home Designers                                        |          $129 |
| Health Practitioners (Physicians, Nutritionists, Naturopaths) |          $129 |
| Mold Detection Dogs                                           |           $79 |

The site uses one shared category catalog with stable IDs. Selecting multiple categories is supported; a combined price is not invented.

## 2. Account, application and dashboard demonstrations

| Area                         | What the client can try now                                                                                                                                                     | Completion limit                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Demo sign-in                 | Fictional professional presets, a separate admin sign-in page, visible sample access details, validation and correct-dashboard navigation                                       | Simulated identity only; no real registration, authentication or password recovery                             |
| Account switching            | Explicit switching, sign-out, unsaved-work confirmation, isolated drafts and reset                                                                                              | No permanent sessions or real account security                                                                 |
| List Your Business           | Public application with contact/business details, multiple categories, services, description/practices and optional credentials                                                 | Submission creates a pending demo application; no owner email or real account is created                       |
| Member workspace | Pending/approved/rejected/inactive examples, permitted profile editing, public-profile preview, sample subscription information and recipient-specific fictional inquiries | Saved eligible linked profile changes reach public views in this tab; reload/reset restores the initial records |
| Photo preview | Validated local JPEG/PNG/WebP selection, explicit save, public profile replacement/removal and isolated drafts | No upload; saved session photos survive account switching, while drafts clear; reload/reset clears all session media |
| Free-consultation preference | Member opt-in/out for free phone calls, public participation flags and matching assignment eligibility | Same-tab demo only; no actual scheduling or notifications |
| Admin workspace | Application/credential decisions, profile edits, public identity, membership/featured scenarios, category creation/renaming, certification/resource editing and publication, analytics/activity and Q&A/review/consultation queues | Production permissions/shared records, final content/ranking and durable reporting remain |
| Listing rules                | Only approved listings with active membership and no suspension qualify for public display; private fields are excluded from public profiles                                    | Real database/payment changes are not connected                                                                |
| Credentials                  | Submitted claims stay unverified; reviewed sample credentials are distinguished; changed claims lose their review status                                                        | Actual verification procedures and permanent evidence storage remain pending                                   |

Approval, membership, suspension, credentials and featured placement remain separate. Members cannot change protected status fields or their record ID.

## 3. Inquiries, Q&A, consultations and reviews

| Feature                  | Working prototype behavior                                                                                                                                         | What it does not do yet                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Profile inquiry | Validates fictional name/email/message and stores linked inquiries in the intended member's same-tab inbox | No email or permanent storage; unlinked sample profiles explicitly remain validation-only |
| Ask a Specialist         | Public browsing/filtering, sample questions, question submission, admin moderation, matching category inboxes and professional answers linked to eligible profiles | No real category emails or permanent questions/answers                                |
| First-answer handling    | First submitted eligible response has publication priority, with admin review retained; later responses can be considered after rejection                          | Not automatic unmoderated publication; final client policy is still needed            |
| Public-question guidance | Explains public visibility, asks visitors to leave out identifying/sensitive information and explains simulated notifications                                      | Does not automatically detect or redact all personal information                      |
| Free consultations       | Phone/no-preference request, admin assignment to an eligible participating specialist, member acceptance/decline, cancellation and same-tab public status          | No real notification, calendar booking, call delivery or payment                      |
| Reviews/ratings          | Fictional written reviews/stars, calculated averages, rating filters, local review submission, admin moderation and member review visibility                       | No verified real-customer reviews or permanent review records                         |
| Featured listings | Fictional public examples, admin entitlement controls and an eligible placement preview | No paid upgrade or final public priority-ranking system; all controls are session-only |

## 4. Latest client revisions completed

- Reordered the homepage: hero → How it works → Specialty → About Us → Ways to get started → Featured listings → Our review process → For Specialists.
- Expanded the hero to include health practitioners. The exact “every certified specialist” promise was not added because approval alone does not establish certification; this wording still needs client agreement.
- Removed the right-hand Specialty sentence and the requested featured-listing subheading.
- Updated the About introduction to include a healthier home and healthy body; expanded the Q&A introduction to include mold-related health issues.
- Replaced the paid-call promotion with free-consultation wording for participating specialists.
- Updated public labels to Find Specialists, For Specialists and Certifications.
- Moved the profile photo slot beside the business title and reduced section spacing.
- Added the free-phone participation indication and the category-specific Q&A demo inbox.
- Updated consultation steps/explanations and changed the button to Submit request.
- Updated the Certifications heading and moved its introduction below the heading.
- Removed the pricing consultation bubble and the requested suspension wording from pricing/review-process copy. The actual eligibility rule is unchanged.
- Added licensed placeholder home-interior hero footage with pause/play controls, static fallbacks for reduced-motion/data-saving preferences, and three subtle scroll reveals. No scroll hijacking; content stays visible without JavaScript.
- Added an on-demand embedded Google Maps city preview and corrected the remaining About page Specialist headings.
- Kept the logo position and existing fonts/colors. New logo, final client film/banner media, alternative font/color choices, exact business pins and certification wording remain pending.

## 5. Verification and client walkthrough

The [22 October quality handoff](../docs/quality-audit-handoff.md) records the latest checks and additional browser coverage. The showcase totals below describe the earlier revision.

Typecheck, lint, all 92 unit tests and the demo build passed. All 216 runnable desktop/tablet/mobile browser scenarios passed across completed runs and targeted corrections; 9 intentional viewport-specific skips remain. The final affected browser run passed 12/12 checks. Desktop/tablet/mobile renders and 320px overflow were reviewed. Production mode still rejects missing opt-in. These checks do not replace physical iPhone/Android, Safari/Firefox/Edge or production-service testing.

Start at `/demo/walkthrough`: apply with fictional details → open the prepared member account → review as admin → try a category question/answer → request, assign and accept a free consultation. Use the displayed demo presets; no real credentials are needed.

Video/motion and city-map follow-up: see the [current follow-up handoff](../docs/homepage-motion-handoff.md) for its separate verification and licensed asset source. The verification numbers above describe the preceding showcase run.

Developer evidence: [showcase handoff](../docs/client-update-showcase-handoff.md), [build checklist](../docs/build-checklist.md) and [scope comparison](../docs/remaining-scope-report.md). Confidential original client documents remain outside the published repository.
