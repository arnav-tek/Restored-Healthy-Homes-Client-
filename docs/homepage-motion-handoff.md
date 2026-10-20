# Homepage video, motion and remaining client updates

20 October 2026. Follow-up to the client showcase; demo only.

## Design and behavior

Retain sage #3d5c3b / #5c7a5a, cream #f5f0e8, clay #b3622f and brown #3b2a1a; Georgia headings and Arial body. The two-column desktop hero and eight-section order remain. A home-interior video sits behind the hero with a solid dark-sage tint for readable text/search. Its controls share the existing follow-up row and wrap on mobile. This is labeled demo footage, not a client property or company film.

Three story sections receive a single small reveal on entering view. Content starts visible, stays accessible without JavaScript, and there is no scroll hijacking or per-frame React state. Reduced-motion users get static content and a poster. The muted, inline video pauses out of view/when the tab is hidden; manual pause is respected. Data-saving preference prevents automatic video loading. Explicit keyboard-accessible play is available. Playback failure leaves a still image and useful status.

The profile location panel now offers an on-demand Google Maps city preview, with a direct link fallback. No exact business address is invented. No maps request occurs until the user opens the preview; search/radius still use the existing local demo adapter, with no browser geolocation or external geocoding. Remaining About “Explore Professionals” headings were corrected to “Explore Specialists.”

## Media provenance

- Clip: [Modern living room with wooden furniture, Mixkit item 3090](https://mixkit.co/free-stock-video/modern-living-room-with-wooden-furniture-3090/).
- [Mixkit Stock Video Free License](https://mixkit.co/license/modal/videoFree/) checked 20 October 2026; the item is explicitly marked Free License for commercial/personal use. No endorsement is implied. Replace with approved client media for final branding.
- Local assets: `public/media/demo-home-interior.mp4` (3,009,655 bytes, approximately 10 seconds, no audio track) and its supplied poster `demo-home-interior.jpg` (88,265 bytes). No third-party player or new dependency.
- SHA-256 video: `ae91468b85725aacc5b73cd070dda181e1cf00f9fbec93ad37dcdd013bd62f97`; poster: `9a0216a113f9dc3a49298c1a4d5f3bdac41195dee91e138115e99b162f5127f8`.
- Map behavior: [Google Maps sharing/embedding guidance](https://support.google.com/maps/answer/7101463?hl=en); demo city query embed only, no API key or account. Provider availability remains external; the direct link is always present.

## Remaining client requests

Requested homepage order, copy/removals, Specialist/Certifications labels, free-phone demo coordination, category Q&A, compact profiles, pricing removals and demo media/motion are implemented. Exact business pins still require public addresses. Replacement logo/font/color selections, final company film/story/captions/transcript, certification wording/verification policy and first-answer/free-call operating decisions require client input. Supabase/email/payments and the broader original backlog remain deferred as recorded in `updates/remaining-work.md`. No client approval or real integration is implied.

## Verification

- `npm run typecheck`, full lint, focused final-file lint and `npm test`: pass; 92 unit tests. Final `tsc --noEmit` also passes after the browser-test navigation assertion.
- `npm run build:demo`: pass against final functional source. Default `npm run build` correctly rejects missing opt-in with exit 1; production guard unchanged.
- Affected `npm run test:e2e` run: 72 selected cases across desktop/tablet/mobile; 69 applicable scenarios pass across the main run and targeted correction, with 3 intentional viewport-specific skips. The main run had 68 passes and one existing Q&A navigation race; adding explicit public-route/title assertions before switching accounts resolved it, and all 3 viewport reruns passed. No assertions were removed or bypassed.
- All 15 new motion/map scenarios pass, including actual video playback, keyboard pause/resume, offscreen pausing, explicit play with reduced-motion/data-saving preferences, failed-video fallback, no-script/no-video-transfer behavior and deferred map loading. Map fixtures keep automated checks deterministic; a real Google city map was also loaded and visually inspected separately.
- Reviewed actual hero renders at 1440, 768, 390 and 320px plus a real map on mobile. No horizontal overflow or detected axe violations in final tested views. The initial opacity fade briefly reduced text contrast; replaced it with transform-only movement so text retains full contrast throughout. The initial no-script message was replaced with the existing readiness pattern to make it reliably visible.
- Search, profile eligibility/returns, inquiry validation, sample-photo isolation, public Q&A attribution, reviews/statistics and existing preview navigation regressions pass in the affected run. No credentials, database, payment/email integration or new dependency was added.
- Evidence: ignored `output/motion-*.log` and `output/playwright/motion-review-*`, `hero-motion-*`, `city-map-*`. Chromium emulation and automated checks do not replace physical-device/other-browser/production-performance verification.
- Updated both plain-language reports in `updates/` and the scope/checklist. Source follow-up is prepared for the previously authorized GitHub push; no Vercel deployment was run in this task.
