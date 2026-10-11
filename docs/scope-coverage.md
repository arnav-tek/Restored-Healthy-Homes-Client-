# Source-to-delivery coverage

Reconciled for frontend review 2026-10-11. This is a coverage index, not additional scope or implementation authorization. The updated overview and later client confirmations govern; the original Word brief and earlier pasted overview supply detail where not superseded. Read the build checklist and client-preview handoff for implementation acceptance and evidence. A completed demo is not a completed production service.

## Requirement coverage

Overview section numbers below refer to `Project overview/restored-healthy-homes-project-overview.md`; Word section numbers refer to the original developer brief. All 28 overview sections are mapped here, including contextual sections.

| Requirement and source | Current coverage / remaining delivery | Destination |
| --- | --- | --- |
| Platform and visitor/member/admin roles — overview 1–2, 26; Word 1 | Demo platform exists; real shared records, permissions and paid membership remain | 3–5 |
| Eight categories, confirmed rates, multiple category selection, extensible categories — overview 3; Word 2; client corrections | Shared catalog and rename demo exist; real category associations and combined-category billing remain | 3–4 |
| Homepage hero, city/ZIP/category search, category browse, statistics — Word 3.1; overview 3, 19–20 | 2H-1 homepage layout includes all eight catalog links, working search and derived session-aware demo statistics; final copy review and real data remain | Demo 2H-1; real data in 3/5 |
| Directory keyword/category/location/state/rating/radius discovery — overview 3, 12; Word 3.1, 4 | Demo keyword/category/city/ZIP/radius plus state/minimum-rating filters and published card summaries implemented in 2I-1; real location/service-area data and featured priority remain | Demo 2I-1; production 3/4 |
| Profiles, public professional name, photos/logo, bio/practices, categories, location, contact options — overview 4, 7; Word 3.1, 3.4 | Basic profile and inquiry demo exist; media management, intended public identity fields and persistence remain | 3/5 |
| Application fields, pending state, approve/reject, owner alert, rejected-applicant notice — overview 5; Word 3.2 | Form and decisions demonstrated; durable applications, emails and public eligibility integration remain | 3–4 |
| Recurring category subscriptions, payment updates, lapse/unpublish — overview 6; Word 3.3 | Status examples only; Stripe checkout/billing/lifecycle integration remains | 4 |
| Member profile/certification/media/billing/inquiry/consultation/Q&A workspace — overview 7; Word 3.4 | Most navigation/workflows demonstrated; uploads, real accounts and integrations remain | 3–5 |
| Public Q&A, category alerts, verified-member answers, profile attribution, moderation/removal — overview 8; Word 3.5 | Session workflows and eligible explicit profile associations implemented; verified-member policy, real category notifications and persistence remain | Frontend ready; production 3/5 |
| Paid short consultation, specialist matching/notification and admin tracking — overview 9; Word 3.5 | Requests/assignment/acceptance demo exists; paid booking and agreed delivery remain. Original $50/15-minute baseline is preserved in authoritative scope | 4–5 |
| Written reviews, star ratings, averages, rating filters, moderation/verification — overview 10; Word 4 | 2G-1 submissions plus 2G-2 session moderation, linked member visibility and accessible stars implemented; 2I-1 adds published card averages/counts and rating filters. Agreed verification/removal policy and durable integration remain | Demo 2I-1; production 5 |
| Paid featured upgrade, visible featured state and priority placement — overview 11; Word 4 | Labelled featured examples use public eligibility and existing entitlement rules; purchase terms, real billing and agreed directory priority remain | Frontend examples ready; production 4 |
| Eight education paths, certifications/timeline/cost/external links/apply CTA — overview 13; Word 3.6 | 2H-2 layout and typed pathways include official provider references, application links and explicit timeline/total-cost placeholders. Provider/program selection and client content approval remain; platform does not certify | Layout 2H-2; approved content/CMS in 5 |
| Automatically displayed certification badges — overview 13; Word 4 | Reviewed badges derive from existing credential decisions; changed claims reset and submitted claims are distinct. Final policy and durable records remain | Frontend ready; production 3/5 |
| Blog/resources and owner content management — overview 14; Word 4 | Typed sample articles, listing/category filtering/empty states and article layouts ready; client editorial approval and owner CMS editing remain | Frontend ready; content/CMS 5 |
| Newsletter capture and selected platform integration — overview 15; Word 4 | Accessible validated preview clears input and never subscribes/sends/stores addresses; provider and real consent/subscription delivery remain | Frontend ready; production 5 |
| About Us story/Why/text/client-produced video — overview 16, 27; client conversation | 2H-1 layout/navigation and typed placeholders built; final client story/Why/copy/video/captions/transcript and content approval remain outstanding | Layout 2H-1; final assets/client review |
| Admin listing/profile edits, decisions, subscriptions, community/content/featured controls and analytics — overview 17; Word 3.7 | Decisions/queues exist; profile edits, complete analytics and remaining management tools still required | Remaining demo milestones as scoped; 3–5 |
| Application, approval/rejection, Q&A, consultation, inquiry/account notifications — overview 18; Word 5, 7 | No real delivery yet | 4–5 |
| Navigation, category views and Privacy/Terms/legal wording — overview 19, 27; client conversation | Public navigation and resource links exist; Terms/Privacy and contact show pending-content states. Legal wording/disclaimer placement and approved contact details remain | Frontend ready; client content 5 |
| Similar earthy visual direction and adjustable colors — overview 20; client conversation | Established design system; final client review remains. Old mandatory exact layouts/modals/footer columns are superseded by design flexibility | Ongoing review; 6 |
| Next.js/Supabase/Stripe/Vercel — overview 21; client conversation | Next.js implemented; services/hosting integration remains. Library/email choices are developer decisions | 3–6 |
| Secure owner/member access, public/private boundaries — overview 22; Word 3.7, 5 | Demo gates only; server authorization, database/storage policies and security verification remain | 3; launch review in 6 |
| Mobile/major browsers/performance/media/HTTPS — overview 23; Word 5, 7 | Chromium demo checks exist; real devices, browser matrix, mobile measurements and production HTTPS remain | 6 |
| Exclusions and superseded restrictions — overview 24; Word 4, 8; client corrections | Referral/native apps/social login/logo design excluded. Original deferral of reviews/featured/location/blog/newsletter/badges is superseded | Scope boundary |
| Open policies/content — overview 25 | Billing, featured, review verification, consultation routing/delivery, location, email and client content decisions recorded | Resolve before affected integration |
| Reviews/revisions, owner walkthrough/written guide, client accounts, delivery context — overview 27–28; Word 7, 9 | Tracked; final review, handoff, schedule/support clarification remain. No unlimited revisions or revised deadline inferred | 6 / delivery planning |

## Interpretation boundaries

- Original Word section 9 is proposal/commercial guidance, not extra website functionality. Confidential commercial details remain in the authoritative private documents.
- Original Netlify hosting and obsolete category/price-tier counts are superseded by explicit client decisions. Do not restore them as missing requirements.
- Approval and payment are separate requirements: approval alone does not publish an unpaid listing; payment cannot clear suspension.
- Maps, automatic specialist payouts, an in-app calling system, homeowner accounts, social integrations, review replies and a custom newsletter campaign editor are not established commitments. Add only if separately agreed. Review verification may affect a future account decision.
- Phone/video delivery and written consultation summaries are recorded prototype details needing confirmation; do not silently omit them or treat them as a confirmed custom calling system.
- The old exact-design instructions do not make registration modals, profile modals, circular abbreviations, a particular card gradient or a four-column footer mandatory. Maintain the agreed feel and client review instead.
- Numeric 1–5 ratings and decorative stars share the 2G-2 presentation; 2H-1 homepage statistics reuse the published-only session calculation. Future search/card ratings must do the same. Production verification/moderation policy remains separate from this demo.
- Demo/session state, real integration, and final content are separate completion criteria. Future reviews must cite a source and distinguish those states before labeling something missing.

## Audit conclusion

The requested remaining frontend presentation is implemented for client review. Final content/decisions, durable production workflows and integrations remain separate acceptance items in the build checklist. This coverage index does not claim production completion or replace client acceptance.
