# Client showcase review — 26 October 2026

Follow-up: the user authorized repairs after this review. See [the showcase-fix handoff](client-showcase-fixes-handoff.md) for the implementation, actual verification and publication status. The findings and failed-run evidence below describe the original `f24faf6` baseline and are retained as history.

Reviewed source revision `f24faf6cdcbf47e003d822e1698ff346b51a7f7b` and the published demo at <https://restored-healthy-homes-client.vercel.app/>. This is a frontend/demo review, not approval of final content or a production launch. Application code was not changed by this review.

**Recommendation:** suitable for a guided prototype discussion, but resolve the reproduced Q&A queue/filter issue and make the demo boundaries clearer before sending the link for an unassisted walkthrough. Final copy/media/policy acceptance is separate.

## Findings to address or explain before the presentation

1. **Q&A queue/filter navigation race — functional follow-up.** `src/features/qa/admin-qa.tsx:60`, `src/features/qa/workspace-filters.tsx:17`, `src/features/dashboard/use-dashboard-navigation.ts:17`: click Answers and immediately select Pending/apply the filter. The filter can use the previous Questions query, returning to `?section=qa&qaStatus=pending` and displaying matching questions. Reproduced separately on the hosted site after the connected-application test failed; the answer itself remained in the pending-answer count. Waiting for the Answers route/current state before filtering works. Coordinate queue navigation and filter state, or disable filtering while that navigation is pending. Do not explain this as missing email/database integration.

2. **Hero copy differs from the client-revision expectation.** `src/app/page.tsx:41`: current copy says “our network of health professionals helps families heal”; the existing acceptance test expects “health practitioners who help families heal.” The related browser assertion fails. Confirm the intended revision rather than silently changing approved copy or relaxing the test. The unsupported blanket certification promise should still not be introduced.

3. **Demo sign-in needs clearer instructions beside the inputs.** `src/features/demo-sign-in/login-form.tsx:101`, `src/app/login/page.tsx:30`, `src/app/admin/login/page.tsx:30`: the form looks like ordinary sign-in; fictional presets are collapsed under Quick access. The footer describes the client preview, but there is no nearby instruction to use fictional accounts and avoid real credentials. A short, visible note and clearer preset discovery would make an unassisted client visit easier. Presets, validation, interface gates, switching and draft isolation work in the exercised checks; this is not real authentication.

4. **Fictional review/statistic disclosure is remote from the figures.** `src/features/reviews/reviews-section.tsx:43`, `src/features/reviews/review-content.tsx:38`, `src/features/home/home-statistics.tsx:72`: reviews and averages appear as published feedback, with only the general client-preview footer providing the broader fictional-data context. Add a concise sample-data disclosure near these blocks before presenting the site as anything beyond a prototype. The averages are calculated from records, not hardcoded achievements.

5. **Hero autoplay accessibility tradeoff remains.** `src/features/home/hero-video.tsx:73`: the decorative video loops without a pause/stop control. Controls were deliberately removed at the user's earlier request; reduced-motion/data-saving and offscreen/static fallbacks work. This does not resolve the control requirement for automatic movement lasting more than five seconds alongside other content. Choose a discreet pause/stop option, stop after a brief introduction, or use a static hero. See [W3C SC 2.2.2 guidance](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html). No controls were restored during this review.

6. **Certifications opening animation makes an immediate accessibility assertion unstable.** `src/app/globals.css:8528`, `src/app/globals.css:8542`: the 200/250ms opacity fades briefly reduce contrast. One immediate axe audit reported 3.95:1 for the introduction and 4.42:1 for metadata. Separate settled-panel audits at 320px passed with both ordinary and reduced motion. This is an animation/test-timing issue, not evidence of permanently low-contrast settled text. Prefer movement without fading readable text, and audit stable states explicitly.

7. **Owner guide needs reconciliation with the connected workflows.** `docs/admin-guide.md:31`, `docs/admin-guide.md:37`, `docs/admin-guide.md:51` still describe fixed public fixtures, canonical-only pricing/categories and unpublished sample photos. Accepted linked profile/category/photo changes now appear publicly within the same tab. Use `docs/connected-workflows-handoff.md` for the current behavior until the guide is revised.

8. **Minor polish:** `/favicon.ico` returns 404 in the hosted browser. It does not block navigation or the main assets; an approved site icon remains useful before wider sharing.

9. **Stale privacy-test heuristic, not a demonstrated private-data leak.** `tests/e2e/preview.spec.ts:150` rejects every `example.invalid` string. The shared public profile snapshot intentionally contains `hello@fern-field.example.invalid`, an allowlisted public contact from `src/data/demo/fixtures.ts:8`. A separate hosted directory HTML/RSC check found none of the checked private owner/customer, internal-note, subscription or private-review markers. Update the test to distinguish approved public fields from private fields while preserving boundary assertions; do not remove the privacy test or expose private application contacts.

## Completed checks

- Rendered 14 public routes at 1440, 768, 390 and 320px: **56/56 checks passed** for HTTP 200, one h1, no horizontal overflow, no broken loaded images and no empty `href="#"` links. This checks heading count, not every heading's visual presentation.
- Crawled **33 distinct discovered internal paths** from Home, Directory, Q&A, Resources, Certifications, Pricing and the walkthrough; all returned HTTP 200. Query variations and intentionally unavailable records are covered separately by the browser suite.
- Retrieved the seven unique external education references from their provider sites: [ACAC](https://www.acac.org/moldinspectioncertification), [IICRC](https://iicrc.org/amrt/), [USGBC](https://support.usgbc.org/hc/en-us/categories/4407292629523-Education), [BPI](https://www.bpi.org/resources/certifications/building-analyst-technician/), [Healthy Materials Lab](https://courses.healthymaterialslab.org/collections/certificate-program), [IFM](https://www.ifm.org/certification/eligibility) and [Mold Dog Services](https://mold-dog.com/about/). Availability of these references is not client approval of providers, program suitability, eligibility, timeline or cost content; those remain pending.
- Menu keyboard open, Escape/focus restoration and dismissal after navigation passed at 768, 390 and 320px. Actual desktop/tablet/mobile/320px screenshots were inspected.
- All **5** focused installed Microsoft Edge checks passed on the hosted site, covering keyboard/menu/form-error focus, photo removal/reselection, static media transfer, unavailable-route recovery and analytics/month layout. This is selected Edge coverage, not a full multi-engine suite.
- Settled open Certifications panel: no detected axe WCAG A/AA violations in the two targeted ordinary/reduced-motion audits. Automated checks are not a complete manual accessibility assessment.
- Hosted cold-browser-cache samples, three per route, with 390px viewport, reduced motion, 4x CPU throttle, added 150ms latency and 200,000 B/s download: median observed LCP Home **1.600s**, Directory **1.484s**, Resources **1.312s**; observed CLS 0. These are synthetic lab samples from this machine/CDN, not a real-user, autoplay-video, physical-device, INP or production speed guarantee.
- Publishing preflight on the same unchanged revision already passed typecheck, zero-warning lint, all **126 unit tests**, demo build and the fail-closed default production build. The preceding connected-workflow run also passed all **18** desktop/tablet/mobile cases. Those results are reused rather than described as new executions in this review.

The comprehensive hosted desktop run completed: **122 cases, 116 passed, 5 failed, 1 intentional viewport-specific skip** in 25.2 minutes. The five failures are classified below; this is not an all-green run. No tests or application behavior were changed to hide failures. Error-adapter scenarios used a separate local error server and are not deliberate failures of the published deployment.

| Failed check | Classification | Follow-up evidence |
| --- | --- | --- |
| Client revision copy | Current hero differs from the expected phrase | Finding 2; rendered copy independently confirmed |
| New application's review/Q&A journey | Q&A queue/filter race after successful application, publication and review steps | Finding 1; independently reproduced on the hosted site |
| Certifications 320px/breakpoint/no-script audit | Axe ran during the opening opacity animation | Finding 6; settled ordinary/reduced-motion audits pass, but the original test is still recorded as failed |
| Public-output privacy smoke | Outdated blanket rejection of the public sample email domain | Finding 9; private-marker and exact public-contact checks independently confirmed |
| Question/answer publish/reject/hide walkthrough | Same queue/filter race left the test in Questions while waiting for an answer link | Finding 1; timed out before completing its later moderation assertions |

The passing cases exercise all other selected desktop application/member/admin, billing, consultation, review, directory/search, public-page, static/no-script and scroll workflows. This does not imply the later portions of an interrupted failed case passed. The separate five-case Edge run passed. New complete mobile/tablet workflow suites, Firefox/WebKit, physical iPhone/Android and assistive-technology user testing were not run in this review; responsive page/menu checks and the earlier same-revision 18-case viewport run provide narrower coverage.

## Presentation boundaries and short walkthrough

Keep the demonstration in one tab and use site navigation. Refresh, full navigation, reset or closing the tab clears memory-only records and identity. Account switching clears drafts but retains accepted records. Use fictional details and the Quick access presets; no email, real account, payment, booking or upload is created.

1. Browse a category and specialist profile; show city-level Maps, services, listed/reviewed credential distinctions and a fictional inquiry.
2. Open member Sign in → Quick access → Fern & Field Inspections → Sign in. Show its intended-recipient inbox, save a permitted edit/photo and follow site links back to the profile.
3. Submit a fictional List Your Business application. As Administrator (`/admin/login` → Quick access), review it, approve it and simulate active membership. Show that eligibility still requires no suspension. Only one submitted-application walkthrough is supported per tab.
4. Show Listings/profile editing, Categories, Certifications/Resources draft/publication, Featured and Analytics. Featured admin controls and membership checkout/failure/recovery/cancellation are demos; member paid featured-upgrade and payment-method-management screens remain unfinished.
5. Demonstrate a category question/answer and moderation; wait for the Answers queue to become current before applying filters. Show a fictional review and changed rating after publication.
6. Request a free phone consultation, assign an eligible opted-in specialist as admin, switch to that member, accept it and return to the public confirmation through site links. This coordinates a request; it does not schedule or conduct a call.

Final About story/film, branding, certification-program details, editorial/contact/legal content and workflow policies still need client input. Supabase, Stripe, email, durable records, secure uploads and launch acceptance remain outside the prototype. These are known scope boundaries, not newly discovered broken frontend controls.

## Evidence

Ignored artifacts: `output/client-review-published-browser.log`, `output/client-review-public-pages.{log,json}`, `output/client-review-internal-links.log`, `output/client-review-menu.log`, `output/client-review-qa-navigation-confirmed.log`, `output/client-review-education-settled.log`, `output/client-review-live-performance.{log,json}` and screenshots/traces under `output/playwright/client-review-*`. Review configs are under ignored `.codex/`.
