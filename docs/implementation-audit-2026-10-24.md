# Client requirements and demo implementation audit — 24 October 2026

## Scope and sources

This is an independent review of the local project, not a production-completion statement. Supabase, real authentication, payment processing, email, shared persistence and real uploads are deliberately excluded from the current demo acceptance boundary.

Compared the original Word brief, the private project overview and conversation alignment, the checked-in October handoffs/updates, and the client's [current Google Doc](https://docs.google.com/document/d/1ahZnxBxMW2bUYc0dEynBpR0jo103pbYS1aigpDPBxHg/edit). The Google Doc was read through its text and HTML exports; the HTML contains no embedded layout-reference images. The latest changes supersede the old paid-consultation baseline: consultations are free phone calls for participating specialists. Membership subscriptions remain paid.

The audit inspected source, ran unit/static/build checks, exercised browser workflows and reproduced additional consistency issues. Application code was not changed. Test probes and exports are under ignored `output/`. Homepage source files changed externally during the audit; browser follow-up uses an isolated copy of the compiled build, so it does not certify subsequent homepage edits or the deployed Vercel revision.

## Conclusion

The project has substantial working demo coverage, including many recent client revisions. It is not yet a completely connected demo. The largest gap is that the application has both fixed public fixtures and editable session records: several public views still read the fixtures after the corresponding dashboard record changes.

Missing live integrations are expected. The inconsistencies and incomplete demo journeys below can be resolved before adding Supabase.

## Confirmed issues and incomplete demo journeys

| Priority | Finding | Evidence and consequence | Recommended completion |
| --- | --- | --- | --- |
| High | Existing sample listings do not consistently follow session eligibility | Browser: suspend Fern & Field Inspections as admin, navigate using site links to Find Specialists, and open its profile. Fern remains in the public directory and its profile loads. Featured cards do observe session eligibility. `src/features/directory/directory-content.tsx`, `src/domain/public-application.ts`, and `src/features/profiles/load-profile.ts` retain fixed public data for existing sample listings. | Apply one public session projection to linked seeded records as well as the submitted application. Approval, membership failure/cancellation and suspension should affect all public surfaces consistently. |
| Medium | Existing profile edits and free-call preferences are only partially public | Public identity has a session overlay, but seeded business descriptions/categories/credentials and free-call flags still come from fixed profile/card data. Member opt-out changes assignment eligibility without removing the fixed public participation indication. | Reuse the same accepted public projection for directory, profile, featured cards and consultation flags. |
| Medium | Category renaming does not reach every public surface | Browser: rename Mold Testing / Inspectors to an audit label; admin accepts it, but the public directory retains the original name. `publicDirectoryCatalog` deliberately preserves canonical labels. Homepage/category/pricing server views also use the base catalog. Added categories and form/dashboard names have better session support. | Keep IDs/prices stable while applying accepted display names consistently. Decide whether newly created categories should also appear on homepage and pricing during the demo. |
| Medium | Resource-card mouse navigation is unreliable with motion enabled | Existing resource draft/publication test failed in the broader run and twice in a focused rerun: clicking the newly published article heading left the page on Resources. The unchanged test passed with reduced motion. `src/components/ui/scroll-effects.tsx` cancels translations on pointer interaction; interaction with the moving card needs investigation. | Ensure pointer down/up activates the same link while animations stop. Verify mouse, touch and keyboard with motion enabled; do not simply weaken the test or disable all motion. |
| Medium | Homepage counts omit a newly published application | Reducer/selector reproduction: application approved and activated; directory has 9 entries while homepage count remains 8. `src/features/home/home-statistics.tsx` uses the initial listings and public ID snapshot. | Derive counts/states/ratings from the same eligible session collection used by directory results. |
| Medium | Newly published applications cannot participate fully in reviews or linked Q&A attribution | `profile-view.tsx` explicitly omits review submission for session-created profiles. Reducer reproduction produced one published answer by the new application, but its profile link was absent. `professionalForMember` only maps preset members, and review eligibility uses the initial public IDs. | Include eligible applications in profile associations/review eligibility, public answer links and member review views. |
| Incomplete demo | Inquiry form and member inbox are disconnected | `inquiry-form.tsx` validates, clears the values and displays confirmation; no accepted inquiry record is created. Member inbox items are separately seeded. | If the review must demonstrate the entire journey, store a fictional inquiry in session state with its recipient and show it in the correct member inbox. Email remains deferred. |
| Incomplete demo | Photo selection does not update the public profile | `showcase-preferences.tsx` validates and previews a local image only in the editor; public profiles retain a photo placeholder. | Optionally demonstrate accepted session-only photo replacement/removal on the public profile. Real storage/upload security remains deferred. |
| Incomplete feature | Featured purchase and directory priority are absent | Admin featured toggles update homepage examples. `publicFeaturedExamples` explicitly implements no search ranking; members have no featured upgrade journey. | Confirm upgrade terms and ranking. Then demonstrate upgrade/entitlement and featured placement without collecting money; connect Stripe later. |
| Incomplete demo | Billing covers scenarios but not payment-method management | Checkout, failure/recovery and cancellation demos exist. A payment-method/customer-portal flow is not implemented. | Demonstrate a clearly fictional payment-management state if needed for review, without collecting real card details. Real provider UI belongs to integration work. |
| Incomplete demo | Newsletter is validation-only | The form explicitly clears the address and does not subscribe/save/send. | Accept as a clearly explained preview, or add a fictional session subscription/confirmation journey. Actual consent/unsubscribe/provider delivery remains outstanding. |
| Low | Featured copy contradicts its examples | “Real professionals. Real expertise.” remains above a disclosure that the cards are fictional. | Use wording that matches the preview or supply approved real listings before making that claim. |

The first six findings are consistency/reliability defects or gaps in connected demo behavior. The later preview limitations were often explicitly documented by earlier phases; they should not be misrepresented as failed Supabase integrations or as newly discovered production defects.

## Latest client Google Doc: request-by-request coverage

| Client request | Local implementation status |
| --- | --- |
| Discuss text/font/color changes | Specified wording changes implemented. No replacement font or palette is specified in the Doc; approval/choices remain open. |
| New logo, retain location; client supplies logo | Position retained. Final supplied logo remains pending. |
| Video banners or dynamic scroll elements | Placeholder hero video and scroll effects implemented. Static/reduced-motion fallbacks exist. Final footage/visual approval remain pending; resource-link motion issue above must be resolved. |
| Hero includes health practitioners and families healing | Implemented. Exact “every certified specialist” wording omitted intentionally. Agree truthful wording or a verification policy; do not call this exact-copy completion. |
| Remove right-hand Specialty sentence | Implemented. |
| Eight-section homepage order | Implemented in the audited source: hero, How it works, Specialty, About Us, Ways to get started, Featured, Review process, specialist CTA. |
| Remove featured “Here are a…” subheading | Removed. Other featured heading/disclosure remains. |
| Remove “and no suspension” from public listing-approval explanation | Wording removed in requested location; underlying eligibility rule remains, as it should. |
| About introduction includes healthier home and healthy body | Implemented. This does not supply the company's final personal story/Why. |
| Q&A homepage copy includes mold-related health issues | Implemented. |
| Replace paid call promotion with free consultation/participating-specialist copy | Implemented. No paid consultation checkout is now required by this revision. |
| Find Professionals → Find Specialists | Public navigation/copy updated. |
| Small Google Maps business preview | Partial: an on-demand city map and external link exist, not an accurate business-location pin. Requires approved public business locations. |
| Profile image on right; tighter sections | Layout implemented; sample upload remains editor-only and real photos are pending. |
| Target profile layout/reference | No separate target reference was embedded in the retrieved Doc. Exact conformance to an unspecified reference cannot be verified. |
| Identify specialists offering free calls on listing/profile | Fixed fictional flags implemented; changing a linked member's participation does not consistently update those public flags. |
| Questions to every relevant specialist's email inbox | Category-matched dashboard inbox implemented after moderation; actual email is deliberately deferred. |
| First answer published | First submitted response has priority, but admin review remains before publication. Automatic first-response publication is not implemented; agree this policy with the client. |
| No personal identification in public questions; explain process at top | Guidance appears above the form and private account fields are excluded. Typed names/contact details are not automatically detected or removed. Establish moderation responsibility rather than promising automatic anonymization. |
| Free phone calls only with participating specialists | Demo request, participation, matching/assignment and acceptance rules implemented. Scheduling/call delivery are not simulated bookings. |
| Consultation request/coordination wording | Updated; delivery wording removed, request text explains session-only behavior. |
| Record Request → Submit Request | Implemented. |
| Education → Certifications; For Professionals → For Specialists | Updated public labels. Existing routes remain intentionally stable. |
| Grow your professional knowledge; explanatory text below Choose your path | Implemented with certification/training/license distinctions. |
| Remove pricing consultation bubble and suspension phrase | Implemented in the requested pricing presentation. |

## Original agreed scope: working demo and remaining boundaries

| Area | Working demo coverage | Remaining beyond findings above |
| --- | --- | --- |
| Category memberships | Eight confirmed categories/rates; multi-category selection; admin creation/rename | Combined-category billing decision; permanent catalog/billing associations |
| Search/directory | Keyword, category, city/ZIP, state, radius, rating, sorting, pagination and safe return links | Real location/service-area data; agreed featured ranking |
| Accounts | Separate member/admin entry points; fictional presets; gates, switching, sign-out/reset/drafts | Real signup, login, recovery, permissions and account ownership |
| Applications | Pending submission, member editing, admin decisions and eligible same-tab publication | Persistence and notifications; full public synchronization as described above |
| Billing | Checkout/failure/recovery/cancellation examples; independent approval/suspension | Real Stripe, webhooks, reconciliation, payment-method management and final lifecycle policies |
| Admin | Listing/credential decisions, profile editing, categories, membership/featured scenarios, certifications/resources, basic analytics/activity | Shared operational data and authorization; complete public synchronization |
| Q&A | Submission, category inbox, member answers, moderation, first-response priority, public views | New-applicant attribution; client publication policy; real email/concurrency/persistence |
| Reviews | Seeded-profile submission, moderation and calculated ratings | Newly submitted profile support; verification/abuse policy and persistence |
| Consultations | Free phone request, assignment/reassignment, member acceptance/decline, notes/cancellation/status | Approved timing, matching, contact/scheduling and notifications |
| Education | Eight pathways, provider references, admin editing/publication | Approved programs, entry requirements, timelines and costs; many current fields are placeholders |
| Resources | Sample articles, filters, session editor/publication | Motion/link defect; final articles/assets; permanent publishing. Fixed public sample articles are separate from session editor records. |
| About | Page, story/purpose layout and video slot | Actual company story, Why, client video/poster/captions/transcript |
| Contact/legal | Layouts and pending-content states | Approved support details, Privacy/Terms and requested asterisk/disclaimer wording/placement |
| Owner handoff | Prototype admin guide and acceptance checklist exist | Final real-service procedures, walkthrough/training and client acceptance |
| Launch | Demo guard and no-index conventions | Real-service security/access tests, deployment verification, domain/HTTPS, backups/monitoring, physical devices and production performance |

Referral benefits, native apps, social login, logo production and an in-app calling platform are not missing agreed deliverables. A calendar service and automatic payouts must not be added as inferred requirements.

## Verification evidence

- Independent typecheck, lint, all **120 unit tests**, and demo build passed before concurrent homepage edits.
- Full browser attempt did not finish cleanly: resource navigation failed, a sign-in journey timed out, then the shared preview server stopped responding. Connection-refused failures are environmental interruptions, not evidence that all affected features are broken.
- Resource navigation failed twice more with default motion, then passed with reduced motion. This requires a fix/retest before declaring a clean browser result.
- The interrupted sign-in/validation journey passed again on the isolated server with both normal motion and reduced motion. A persistent sign-in defect was not reproduced.
- Additional browser probes confirmed suspended seeded-profile visibility and public category rename mismatch.
- Additional reducer/selector probes confirmed 9 directory entries versus 8 homepage count and a published application answer without a profile link.
- Seven public routes (home, About, directory, consultations, Certifications, pricing and Resources) had no horizontal overflow at 1440, 768, 390 and 320 pixels: 28 viewport/route checks. Representative desktop/mobile screenshots were inspected. This is browser emulation, not physical-device acceptance.
- Isolated browser follow-up: **43 passed, 2 intentional viewport skips** across desktop/tablet/mobile. Covered application publication and removal, featured/billing scenarios, Q&A moderation and reviews. Normal-motion sign-in passed separately. Log: `output/current-audit-isolated.log`.
- No claim of an uninterrupted full-suite pass or live Vercel verification is made. Representative screenshots and the failing-resource traces remain in `output/`; the temporary audit server was stopped and test configuration/source probes removed. The generated isolated build remains at `output/current-audit-runtime/` because automatic approval review blocked its recursive deletion with the generic reason “blocked by policy.”

## Suggested order before the next client walkthrough

1. Fix the motion/link interaction; retain the isolated passing sign-in rerun as evidence without calling the interrupted full run green.
2. Consolidate accepted session data for public eligibility, profile fields, free-call badges, category labels and statistics.
3. Connect new applications to reviews and Q&A profile attribution.
4. Decide which remaining demo-only journeys to complete now: inquiry inbox, public photo preview, featured upgrade and payment-method preview. None requires live payment collection.
5. Reconcile the authoritative overview with the new free-phone scope and remove contradictory current claims from summaries. Preserve older handoffs as historical evidence.
6. Collect final client assets/policies separately. Then add Supabase/Stripe/email in scoped stages and retest real cross-account security and persistence.
