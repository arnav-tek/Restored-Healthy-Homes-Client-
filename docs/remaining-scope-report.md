# Remaining scope — client showcase, 2026-10-20

Checked against the authoritative overview/alignment and the client's latest revision list. This report describes actual prototype behavior, not production completion. The user explicitly deferred Supabase and email integration until after client review. Existing approved features remain in scope; referral benefits remain excluded.

## Original functional scope

| Area | Showcase now | Still required for live operation |
| --- | --- | --- |
| Accounts and permissions (part 1) | Fictional member/admin presets, safe workspace navigation, sign-out/draft isolation and reset | Client-owned Supabase project, real registration/login/recovery, server session validation, role/ownership enforcement, migrations, RLS/grants and adversarial access tests |
| Applications and profile lifecycle (part 2) | Application → pending confirmation → simulated member account → admin approval/rejection; protected status fields, profile editor, unverified credentials and local sample-photo preview | Permanent records, real ownership, secure photo/logo storage and processing, admin listing editor, real notifications and audit trail |
| Directory and public profiles | Eight stable categories, URL search/filter/sort/pagination, published review ratings, eligibility gates, public projections and profile navigation | Production location/address/service-area data and provider; real profile records and maintained public contact details |
| Memberships | Canonical frontend prices and read-only sample states; approval, membership and suspension remain separate | Stripe subscription/customer management, verified/idempotent webhooks, reconciliation, lifecycle rules and multi-category billing decision |
| Featured listings | Fictional examples and eligibility-aware presentation | Agreed upgrade price/duration/ranking, purchases/entitlements, actual priority placement and admin management |
| Inquiries and email | Validated inquiry preview and separately seeded fictional inbox | Stored messages, verified sender domain/provider, delivery/retry/error handling, abuse controls and notifications |
| Q&A | Category-matched member inbox, pending questions/answers, admin moderation, first-response priority and linked public attribution | Durable records, actual category emails, concurrent first-response selection on the server and final moderation/publication policy |
| Reviews and ratings | Clearly fictional reviews, local submission/moderation and calculated ratings | Review-verification policy, permanent reviews, live moderation and abuse controls |
| Consultations | Free phone request → participating specialist assignment → accept/decline → public demo status | Actual contact/notifications and scheduling/confirmation process; client decision on duration, matching and delivery responsibilities. Free phone consultations supersede the old paid-consultation baseline; membership billing remains separate |
| Certifications | Eight stable-category pathways, external-provider references, license/certificate distinctions and application links | Client-selected programs/providers, entry requirements, current timelines/costs, final copy and credential/badge review policy |
| Resources/newsletter | Sample articles, category filtering and a validation-only newsletter preview | Approved articles, CMS/admin publishing, consent/retention decisions, email platform and real subscription/campaign connection |
| About/contact/legal | Working layouts and clearly pending content | Client logo, company story, approved film/poster/captions/transcript, confirmed public contact information and approved legal wording |
| Administration | Demo review queues, approvals/rejections, suspension, credential decisions, category renaming and consultation/Q&A/review management | Real authorization, full listing editing, category creation, featured/content management, operational reporting and audit logs |
| Launch/handoff | Local/hosted demo conventions and no-index/production guard | Production security/storage/payment verification, dependency remediation, backups/monitoring/recovery, supported real-device/browser/performance/SEO checks, approved content, owner guide/training and launch authorization |

## Latest client updates

| Requested update | Result / remaining item |
| --- | --- |
| Global text/font/colors | Specified copy and navigation labels updated. Current approved typography/palette preserved; replacements require client font/color choices |
| New logo; keep position | Position retained. New logo is to be supplied by client |
| Video banner / dynamic scrolling | Follow-up implemented licensed placeholder hero footage, pause/play controls, reduced-motion/data-saving fallbacks and three restrained scroll reveals. Final client footage and visual approval remain pending; see homepage-motion-handoff.md |
| Homepage hero | Expanded healthy-home/health-practitioner wording applied. Blanket “every certified specialist” claim deliberately omitted: approval does not establish certification; client wording/policy decision remains |
| Remove right-hand Specialty text | Done |
| Eight-section homepage order | Done: hero, how it works, specialty, About Us, ways to get started, featured examples, review process, specialist application |
| Featured description removal | “Here are a couple…” removed; fictional-example disclosure retained |
| Listing approval copy | Suspension wording removed from the two requested public explanations. The approved/active/unsuspended business rule is unchanged |
| About and Ask a Specialist homepage copy | Healthy-body and mold-related-health wording applied |
| Free-consultation feature copy | Free call heading and participating-specialist copy replace the old paid offer |
| Find Specialists / For Specialists / Certifications labels | Updated public navigation/footer/headings; stable catalog IDs and existing route URLs preserved |
| Profile photo and spacing | Desktop photo slot moved beside name/details; stacked on small screens. Section spacing reduced. Member can preview a sample image locally; it is not uploaded or published |
| Small business map | On-demand embedded Google Maps city preview plus a direct city-search link. Exact business pins await confirmed public addresses/place data and production map approval; no fictional address is invented |
| Free-call flag in listing box | Shown for explicitly participating fictional listings below business/credential information; member preference controls local consultation assignment availability |
| Q&A category delivery | Matching approved specialists see published questions in a category inbox. No actual email; publication follows provisional admin review |
| First answer | First submitted eligible response gets publication priority. A later response can be published after rejection of the first. Automatic unmoderated publication is not enabled; client must confirm this policy. Existing sample historical answers remain visible |
| No personal identification in public questions | Prominent instruction added; public projections contain question text/category, not private account contacts. Automatic detection/redaction of names or sensitive text is not claimed |
| Free phone consultations, participating specialists only | Implemented in the shared demo offer, validation, preference control and assignment/acceptance checks. Phone/no-preference choices remain; video is not offered as a free service. Timing/duration still require confirmation |
| Consultation process / Submit request | Requested copy/button changes implemented, with a concise explanation that the request stays in this tab and books nothing |
| Certifications heading and intro placement | New heading and copy placement below it implemented; platform does not train or certify specialists |
| Pricing consultation bubble / suspension wording | Both removed. Category membership prices and unresolved multi-category billing remain unchanged |

## Review decisions to request

Confirm new font/color choices (if any), supply logo/media/layout references and real public locations, approve a truthful alternative to the universal certification claim, confirm first-answer moderation rules and recipients, and define free-call duration/matching/scheduling. Account/database/email access can be arranged after this prototype is approved. Supplying those accounts alone does not complete the integration work.
