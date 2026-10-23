# What remains, and what is needed

24 October: public-page scroll animations have been expanded locally; implementation and verification are in the [scroll-motion handoff](../docs/scroll-motion-handoff.md). Final client visual approval and physical-device acceptance remain part of the existing launch scope.

23 October hero update: the footage label and all playback controls are removed, including the circular icon from the follow-up request. Automatic playback uses the smaller MP4 and first-frame/static fallbacks. Approved final client footage/branding still remain pending; the [motion handoff](../docs/homepage-motion-handoff.md) records the implementation and checks.

23 October: [featured and billing demonstrations](../docs/featured-billing-demo-handoff.md) now cover same-tab homepage featured changes for linked public profiles and member checkout, cancellation, failed-payment and recovery screens. They collect no card details or money. The real integration and approval requirements below remain.

Public-listing follow-up: an approved, active, unsuspended submitted application now joins public directory search and a full profile in the same tab. Private contacts/notes stay excluded; refresh/reset clears it. See the [journey handoff](../docs/public-listing-journey-handoff.md). Real shared records and integrations remain outstanding.

Updated: 22 October 2026

Quality follow-up: an owner prototype guide and client acceptance checklist are prepared, with repeatable browser/performance checks and fixes recorded in the [quality handoff](../docs/quality-audit-handoff.md). Final operating procedures and client acceptance remain pending; this does not complete real services or launch requirements.

Admin completion update: profile editing, membership/featured scenarios, category creation/renaming, certification editing, optional public name/email, published resource list/detail and Certifications views, activity and basic analytics can be demonstrated in this tab. These do not complete durable production features, final client content or featured ranking. See the [completion handoff](../docs/admin-completion-handoff.md).

**The website can be demonstrated now. It is not ready for real accounts, payments or customer communications.** Supabase and email were explicitly deferred until after client review. The items below remain part of the agreed final product unless the client changes the scope.

This report uses the original client brief, the updated overview/client confirmations, later change requests and the current implementation. It separates unfinished development from content/assets or decisions the client needs to provide. See [completed work](completed-work.md) for what can already be demonstrated.

## 1. Build first: real accounts and saved records

| Remaining work                   | What needs to be added                                                                                                                                     | What is needed from the client                                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Real professional/admin accounts | Real sign-up/sign-in/recovery, server-checked sessions, member ownership and admin permissions                                                             | Client-owned Supabase project and developer access; confirm who should have admin access                                    |
| Saved applications and profiles  | Database records for applications, approvals/rejections, suspension, profiles and credentials; changes must survive refresh and work across separate users | Confirm approved application/public profile fields and what owner/professional name and contact details may appear publicly |
| Real publication rules           | Connect public pages to shared saved records. Publish only when approved, membership is active and the listing is not suspended                            | Confirm when membership starts and the agreed lifecycle rules; payment integration is also needed                           |
| Image/logo management            | Secure photo/logo upload, storage, replacement/removal and public display, with file/access checks                                                         | Approved sample/real images and media rules; storage access, which can be provided through Supabase                         |
| Production permissions           | Database access rules, server validation and tests proving one professional cannot read/edit another member's private records                              | Correct account ownership/admin assignments and time for connected-service testing                                          |

The current demo account switches and local photo preview do not complete these items. No separate authentication framework or paid upload service is automatically required.

## 2. Connect memberships and communications

| Remaining work                           | What needs to be added                                                                                                                           | What is needed from the client                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Stripe memberships                       | Recurring category subscriptions, checkout, payment-method updates, cancellation, failed-payment handling and reliable payment-status updates    | Client-owned Stripe account/developer access; decide multi-category pricing, subscription start timing and any grace periods |
| Listing visibility after payment changes | Automatically update eligibility after cancellations, failed payments and restored payments; payment must never override suspension or rejection | Approved billing/visibility rules, plus Supabase and Stripe integration                                                      |
| Featured upgrades                        | Upgrade purchase/entitlement, actual agreed priority placement, member controls and admin management                                             | Confirm upgrade price, duration, eligibility and how priority interacts with search/sorting; Stripe connection               |
| Application/account emails               | Owner new-application alert, approval/rejection notices and agreed account/membership notifications, with delivery/error handling                | Transactional email service, sender domain/address and DNS access to verify it; approve recipients and wording               |
| Real inquiries                           | Save/deliver profile inquiries, show the actual member inbox and add submission-abuse controls                                                   | Email service, confirmed contact/recipient rules and decisions on message retention                                          |
| Newsletter                               | Real signup, consent/unsubscribe handling and connection to the chosen campaign service                                                          | Choose the newsletter platform, sender identity, consent wording and campaign/content owner                                  |

**Supabase alone is not the whole integration.** It provides the account/data foundation; Stripe is needed for paid memberships/upgrades, and an email service is needed for delivery. Newsletter and transactional email may use the same provider if its capabilities fit the agreed requirements. No provider pricing or paid plan is assumed here.

## 3. Finish the client-requested Q&A and free-call workflows

### Ask a Specialist

Still to build: permanent questions/answers, real email alerts to the relevant eligible category members, live moderation and a server-side rule deciding which response is first when several specialists reply at nearly the same time.

Needed decisions: confirm whether the first response publishes automatically or requires admin review; define which members qualify to answer, when emails are sent, and how unsuitable/identifying content is handled. The current prototype retains moderation and first-response priority. It does not automatically remove every name or personal detail from typed text.

Needed services: Supabase and the chosen transactional email service. Approve notification copy and sender/recipient rules.

### Free phone consultations

Still to build: saved participation preferences and requests, real request/assignment notifications, the agreed scheduling/contact process and reliable status updates across separate visitor/admin/member sessions.

Needed decisions: call duration, who matches the specialist, how appointment times/contact details are coordinated, and who handles cancellations/no-shows. Confirm any written-summary expectation separately. The latest request is free phone consultations for participating specialists; video calls, paid consultation checkout and automatic payouts are not assumed.

Needed services/content: Supabase, email delivery and participating specialists' approved contact details. A calendar or calling service is only needed if the client chooses that approach; the existing request flow does not book or conduct a call.

## 4. Complete remaining product screens, content and policies

| Area                                 | Still unfinished                                                                                                                  | What is needed                                                                                                                                                                                                      |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin tools | Connect demonstrated listing/category/certification edits, public identity, featured/content controls and analytics to durable authorized data and operational reporting | Approve final setup/editor policies and connect permissions/data. The demo shows active memberships, category counts, monthly applications and membership states; it is not production reporting |
| Category management                  | Persistent rename/add-category workflows that preserve existing listings and billing relationships                                | Confirm new-category setup fields/permissions; existing category prices are already known                                                                                                                           |
| Reviews                              | Permanent reviews/ratings, real moderation and abuse/dispute handling                                                             | Decide how genuine customers/reviews are verified and which removal rules apply; connect saved records                                                                                                              |
| Credentials/badges                   | Real credential review, evidence handling and saved badge decisions                                                               | Confirm accepted qualifications and who checks them. A listed certificate is not automatically a verified credential or professional license                                                                        |
| Certifications content               | Final programs/providers, entry requirements, general steps, timelines and external costs for every category                      | Client-approved provider/program choices and verified source material. Current references/placeholders do not constitute final content approval                                                                     |
| Resources/blog | Connect the demonstrated resource editor and public session views to saved records and server-checked publication | Approved articles, attribution/images and publishing permissions; a separate paid CMS is not assumed |
| About Us                             | Final company story, personal “Why,” supporting copy and actual video                                                             | Client supplies approved text, produced video, poster, captions and transcript; choose a suitable video host                                                                                                        |
| Brand/copy                           | New logo, any replacement font/color scheme, final wording and supplied layout reference                                          | Client supplies logo and explicit font/color choices. Approve a truthful alternative to “every certified specialist,” or establish a supporting verification policy                                                 |
| Final banner media / motion approval | Placeholder hero video and scroll effects are implemented; final branded footage and client visual approval remain                | Supply/approve final footage and any requested motion refinements. The demo footage does not replace the company-story film                                                                                         |
| Profile identity/media | Persist the demonstrated opt-in public professional/owner name and public email, plus real photos/logos, correct contacts and free-call participation | Approve public-field policy and real business details/assets; connect profile storage and ownership checks |
| Location search                      | Real city/ZIP/coordinate/service-area data and final radius behavior                                                              | Choose/approve data source and matching rules. Browser geolocation is not added unless separately agreed                                                                                                            |
| Business map                         | On-demand Google Maps city preview is implemented; accurate business pins and final production map details remain                 | Confirm public addresses/place details and approve the production map method; API access only if that method requires it                                                                                            |
| Contact/legal                        | Actual support/contact information, Privacy/Terms, supplied legal asterisks/disclaimers in agreed places                          | Client-approved contact details and legal wording; confirm placement and who will maintain it                                                                                                                       |

These include unfinished frontend/admin work as well as integrations. They must not all be described as “just connect Supabase.”

## 5. Final launch and owner handoff

- Connect and test the real services end to end, including independent member/admin/visitor sessions, payment changes, email failures and access restrictions.
- Review production security, upload handling, dependencies, backups, monitoring and recovery. The present demo build guard is not a replacement for this work.
- Test physical iPhone/Android and agreed browser/device versions. Automated coverage now includes Chromium viewport emulation and focused Firefox/WebKit/Edge checks; Safari on Apple hardware remains unverified. Local lab measurements do not verify the original mobile speed target under production conditions.
- Configure/verify the client-owned custom domain, DNS, HTTPS, production hosting and approved search-engine visibility. Confirm the deployment actually contains the intended source revision; a GitHub push alone does not prove that.
- Complete client acceptance/revisions and owner training. Extend the prepared prototype admin guide with verified real operating procedures for accounts, payments, emails, saved publication and recovery.

Vercel is the confirmed hosting choice, replacing the older brief's Netlify wording. On 22 October the user authorized pushing the verified admin/theme follow-up to GitHub. No separate Vercel deployment or live-service launch was requested.

## 6. Simple client checklist

Collect these when the prototype is approved and real integration is authorized:

- [ ] Supabase project/developer invitation and final admin users.
- [ ] Stripe account/developer access and billing/featured rules.
- [ ] Transactional email provider, sender details and domain/DNS access; newsletter platform choice.
- [ ] Q&A first-answer/moderation/recipient rules and free-call coordination decisions.
- [ ] Review and credential-verification rules.
- [ ] Logo, any new font/color choices, final About copy/video and approved business photos/locations/contact details.
- [ ] Approved certification-program details and resource articles.
- [ ] Legal wording/placement, custom-domain access and final launch acceptance conditions.

Use account invitations and the normal secure project configuration when integrations begin; no real credentials are needed to review the current prototype. After the foundational accounts/data work, connect billing/email and complete the remaining product/content tools, then verify the full platform before launch.

## 7. Do not treat these as missing agreed features

- Referral program: excluded by the later client agreement.
- Native iOS/Android apps: excluded; responsive web is required.
- Social login/social-media integration: not currently required.
- Logo design/video production: supplied by the client; installing/embedding approved assets remains necessary.
- The former “Phase 2” reviews, featured listings, location search, resources, newsletter and badges remain included in final delivery; the old Word exclusions do not remove them.
- Paid consultations from the old brief are superseded by the latest free-phone request. Membership subscriptions remain paid.

Developer detail and evidence: [current scope comparison](../docs/remaining-scope-report.md), [showcase handoff](../docs/client-update-showcase-handoff.md) and [build checklist](../docs/build-checklist.md). Commercial contract details and the confidential original documents are not reproduced here.
