# Phase 2H-2 — Education and Membership Pricing

## Delivered layout and behavior

- Server-rendered `/education` and `/pricing`, page metadata and existing demo no-index conventions. Homepage/About composition and public copy direction preserved.
- Eight catalog education anchors and native keyboard disclosures, including introductions, external options, general steps, timeline/cost fields and application links. Typed editorial content in `src/data/content/education.ts` joins by immutable category ID; reorder/rename does not change associations. Unknown future IDs show explicit pending content.
- A responsive semantic price comparison reads category names and monthly USD amounts directly from the existing catalog. Working application links, eligibility explanation, separate education fees and unresolved multi-category pricing; no checkout or subscription changes.
- Education/Pricing header and footer links. Header spacing accommodates the additional links; the compact menu now applies through 1359px. Existing signed-in controls and session identity are preserved.

## Content approval and sources

Layout is implemented; final client/provider content approval is outstanding. References are options to explore, not endorsements or required directory credentials. Typical timelines and total training/assessment/renewal costs explicitly remain **To be confirmed**; BPI states that test centers set exam fees. Confirm selected programs, suitability, current enrollment and local licensing/practice requirements before replacing placeholders. Course completion certificates, professional certifications and licenses remain distinct.

Official provider pages checked on 2026-10-07:

- [ACAC microbial investigation certifications](https://www.acac.org/moldinspectioncertification): CMI/CMC experience and examination requirements.
- [IICRC AMRT](https://iicrc.org/amrt/): mold/sewage remediation certification pathway.
- [USGBC education](https://support.usgbc.org/hc/en-us/categories/4407292629523-Education): education resources used for renovations/builders; no course-specific credential promised.
- [BPI Building Analyst Technician](https://www.bpi.org/resources/certifications/building-analyst-technician/): diagnostic testing, BSP prerequisite, field assessment and test-center exam fees. Applies to home performance, not every trade.
- [Healthy Materials Lab](https://courses.healthymaterialslab.org/collections/certificate-program): material health courses/certificate program; no professional license implied.
- [IFM eligibility](https://www.ifm.org/certification/eligibility): discipline, degree and license eligibility; no expanded legal scope implied.
- [Mold Dog / Florida Canine Academy](https://mold-dog.com/about/): provider describes canine training; current program/handler assessment details pending. No detection efficacy, universal credential or independent verification claim repeated.

## Verification

- `npm run typecheck`, `npm run lint`, `npm test` (81 passed) and `npm run build:demo` passed. Default `npm run build` rejected missing demo opt-in, as required.
- Affected browser run: education/pricing, home/About, navigation/preview, search, member and demo sign-in — 69 passed, five intentional skips and one new no-JavaScript pointer-stability timeout. Switched native link activation to keyboard without dropping navigation assertions; final education/pricing rerun: **10 passed, two intentional duplicate-viewport skips**. This verifies all 70 distinct applicable cases across those runs, not a full repository browser suite.
- Earlier partial attempt exposed an outdated application-copy assertion; it now checks the actual heading and no-send/no-permanent-save disclosure. No working controls or behavioral assertions were removed.
- Actual Chromium renders reviewed at 1440/768/390px and 320px, plus 1359/1360px menu boundaries, signed-in professional/admin states, native disclosure focus, axe WCAG A/AA and zero horizontal overflow. Captures: `output/playwright/phase-2h2-*.png`. Physical devices, Safari/Firefox and a complete manual accessibility audit remain unverified.
- Concurrent homepage/statistics edits from the separate “Move hero statistics into left space” chat were preserved. Its subsequent combined demo build includes these routes; additional current-build page captures at 1440/768/390/320px check that education/pricing remain intact. Separate homepage refinements are outside this phase’s implementation.

## Limits and next work

No dependencies, persistence, authentication, payments, uploads, email, integrations, deployment or push added. Application and workspace records remain in the current React session. Production mode still requires explicit demo opt-in. Blog/resources, newsletter, featured placement, search refinements, certification badges, remaining dashboards, approved About/story/video assets and production integrations remain in the existing backlog. Stop after 2H-2 and await the next scoped instruction.
