# Homepage video, motion and remaining client updates

26 October repair: the hero now plays one introduction capped at 4.5 seconds, then holds its frame without looping or restarting. Playback controls remain absent; static/reduced-motion/data-saving fallbacks are retained. See [the current fix handoff](client-showcase-fixes-handoff.md) for verification. Older looping/playback behavior below is historical.

20 October 2026. Follow-up to the client showcase; demo only.

24 October: scroll entrances now extend across homepage cards/sections and other public pages through a shared controller. See the [scroll-motion handoff](scroll-motion-handoff.md) for the current behavior and checks. The video controls remain removed.

## Responsive homepage spacing — 24 October 2026

Replaced the uneven section padding with one homepage-scoped spacing scale. Standard sections use 48px on each side vertically on desktop, 40px on tablet and 28px on mobile, creating 96/80/56px content gaps between neighboring standard sections. After the user's screenshot follow-up, How it works has a separate 96/80/56px top gap below the hero. The full-width feature band and final section use 64/56/40px outer breathing room. Heading-to-card gaps follow a consistent 32/28/24px scale. The feature band owns its vertical padding so nested containers do not double it.

The eight-section order, card layouts, hero playback and existing scroll entrances are preserved. This is a CSS-only presentation update; no data, integration or dependency changes are involved.

Verification: `npm run check` passed typecheck, zero-warning lint, all 120 unit tests and the demo build. Default `npm run build` correctly rejected missing production opt-in (exit 1). All 18 selected existing homepage browser cases passed across Chromium desktop/tablet/mobile, covering normal and once-only scroll motion, hero playback/offscreen behavior, static preferences, blocked/failed media, no-script content, axe and overflow assertions. No new tests or changed assertions were needed.

Fresh build screenshots at 1440, 768, 390 and 320px were captured under `output/playwright/home-spacing-final-*`; desktop/tablet/mobile section boundaries and narrow-mobile reflow were visually reviewed. All four render passes reported no horizontal overflow or uncaught page/hydration errors. Checks used the isolated demo-build copy on port 3202; evidence is in `output/home-spacing-{check,e2e,production-guard,final-render}.log`. `git diff --check` passes. Broader workflows, other engines and physical devices were not rerun for this spacing-only follow-up. No deployment occurred.

The larger hero-to-journey gap was rechecked separately: `npm run check` passed typecheck, lint, all 120 unit tests and the demo build; the default production build still rejected missing opt-in. All 18 selected homepage cases passed again across desktop/tablet/mobile. Fresh build screenshots at those three sizes were visually reviewed and confirmed the 96/80/56px gap with no horizontal overflow. Evidence: `output/home-hero-gap-{check,e2e,production-guard,final-render}.log` and `output/playwright/home-hero-gap-final-*.png`. No other section gaps were changed in this screenshot follow-up.

## Final icon removal — 23 October 2026

The user subsequently requested removal of the remaining circular pause/play icon. All hero video controls and their unused styles/state are now removed, with no replacement control. Normal muted, inline looping playback, first-frame poster protection, offscreen/hidden-tab pausing and page-return synchronization remain. Reduced-motion/data-saving preferences keep the video unloaded; blocked or failed playback leaves the poster. There is no longer a manual playback override. The Browse specialists link keeps its desktop alignment and no empty control row remains on mobile.

Final follow-up verification: `npm run check` passed typecheck, zero-warning lint, all 120 unit tests and the demo build. All 18 affected Chromium desktop/tablet/mobile cases passed, covering actual autoplay, no control/label/native-controls UI, offscreen pause/resume with retained frames, static preferences, blocked/failed playback, no-script and the single optimized-poster behavior. Responsive screenshots were visually reviewed; the icon is absent, Browse specialists retains its desktop position, and mobile has no leftover icon row. Axe/overflow assertions in the inspected views pass.

The initial browser command could not start because port 3100 was already in use; it ran no tests. The completed build was copied to the existing isolated preview on port 3200 and the focused run passed with no test failures. Evidence: `output/hero-no-controls-check.log`, `output/hero-no-controls-e2e.log`, `output/hero-no-controls-e2e-isolated.log` and `output/playwright/hero-motion-{desktop,tablet,mobile}.png`. `git diff --check` passes. Engine compatibility results below describe the preceding icon version; those engines and physical devices were not rerun for this removal. No deployment occurred.

## Earlier playback and control follow-up — 23 October 2026

The requested “Demo home footage” label and rectangular text button have been removed. A compact, keyboard-accessible pause/play icon remains so visitors can stop background motion. Failure/no-script explanations remain available to assistive technology without adding a visible text strip.

Playback now sets native muted/default-muted/autoplay properties before attaching the source. The poster stays visible until the first `playing` event; previously `play` could hide it while the decoder was still loading (observed in local WebKit). A rejected older play promise cannot overwrite newer media-event state. Pausing preserves the decoded frame. Offscreen/hidden-tab pausing and return-to-page synchronization remain; explicit play under reduced-motion/data-saving preferences also survives an offscreen pause and return. Browser autoplay restrictions still offer manual play.

The same licensed placeholder clip was re-encoded locally as H.264 Constrained Baseline level 3.1, yuv420p, with fast-start MP4 metadata, retaining 1280×720, approximately 10.26 seconds and no audio. It is 962,805 bytes, down from 3,009,655 (68% smaller). This is an encoding/playback update; approved client footage is still outstanding. No new media source, player dependency, service or integration was added.

Verification for this follow-up:

- `npm run typecheck`, `npm run lint` and all 120 unit tests in that check passed in `npm run check`. Its first demo-build attempt encountered a concurrent local Next.js build lock; a separate `npm run build:demo` retry passed. Default `npm run build` still rejects production without the explicit demo opt-in (exit 1). Final focused source/test lint and `git diff --check` also passed.
- All 21 focused Chromium cases passed across desktop/tablet/mobile: real media playback, keyboard pause/resume, retained paused frames, manual override of static preferences across offscreen transitions, blocked-autoplay retry, first-frame fallback, failed media, no-script, optimized-poster/no-video requests and the existing deferred city map. Axe and overflow checks passed in those tested views.
- The same 21 focused cases were verified across Firefox, Windows WebKit mobile emulation and installed Edge tablet emulation. The main matrix run passed 19; Edge's full hero check and WebKit's existing map check exceeded the 45-second budget during accessibility scanning/screenshot work after their playback/map assertions passed. Both passed on an unchanged serial rerun (23.2s and 27.1s); no assertion or timeout was changed. Initial failure traces are retained as `output/hero-fix-initial-edge-trace.zip` and `output/hero-fix-initial-webkit-trace.zip`; final retry evidence is `output/hero-fix-compat-rerun.log`.
- Desktop/tablet/mobile hero screenshots under `output/playwright/hero-motion-*` were visually reviewed. The old label/text strip is absent; the circular icon remains operable and the content/search layout is readable.
- Because other local work was building/testing in the same checkout, browser checks use a copy of the completed demo build/public assets under ignored `output/hero-preview`, on port 3200 with `output/hero-playwright.config.ts`. This isolates the checks from later changes to the shared `.next` directory. Evidence: `output/hero-fix-check.log`, `hero-fix-build.log`, `hero-fix-production-guard.log`, `hero-fix-e2e.log` and `hero-fix-compat.log`.
- This is focused local verification. Physical phones, Safari on Apple hardware and the hosted site's current deployment were not checked; nothing was deployed.

## Design and behavior

Retain sage #3d5c3b / #5c7a5a, cream #f5f0e8, clay #b3622f and brown #3b2a1a; Georgia headings and Arial body. The two-column desktop hero and eight-section order remain. A home-interior video sits behind the hero with a solid dark-sage tint for readable text/search. No footage label or playback control is displayed. The footage is a licensed placeholder, not a client property or company film; provenance is recorded here.

Public-page sections and cards receive a single entrance on entering view, with short staggered groups. Content starts visible, stays accessible without JavaScript, and there is no scroll hijacking or per-frame React state. Reduced-motion users get static content and a poster. The muted, inline video pauses out of view/when the tab is hidden. Data-saving preference prevents automatic video loading. Playback failure leaves a still image and an assistive status.

The profile location panel now offers an on-demand Google Maps city preview, with a direct link fallback. No exact business address is invented. No maps request occurs until the user opens the preview; search/radius still use the existing local demo adapter, with no browser geolocation or external geocoding. Remaining About “Explore Professionals” headings were corrected to “Explore Specialists.”

## Media provenance

- Clip: [Modern living room with wooden furniture, Mixkit item 3090](https://mixkit.co/free-stock-video/modern-living-room-with-wooden-furniture-3090/).
- [Mixkit Stock Video Free License](https://mixkit.co/license/modal/videoFree/) checked 20 October 2026; the item is explicitly marked Free License for commercial/personal use. No endorsement is implied. Replace with approved client media for final branding.
- Local assets: `public/media/demo-home-interior.mp4` (962,805 bytes after the 23 October re-encode, approximately 10 seconds, no audio track) and its supplied poster `demo-home-interior.jpg` (88,265 bytes). No third-party player or new app dependency.
- Current SHA-256 video: `df3786a7feefdb32b7ac5017d48b5e9d1d7fafe6693db1744bb5268711190cd0`; poster: `9a0216a113f9dc3a49298c1a4d5f3bdac41195dee91e138115e99b162f5127f8`. Original downloaded video hash: `ae91468b85725aacc5b73cd070dda181e1cf00f9fbec93ad37dcdd013bd62f97`.
- Encoding: local FFmpeg/libx264, `-an -c:v libx264 -profile:v baseline -level:v 3.1 -pix_fmt yuv420p -crf 26 -preset medium -movflags +faststart`. Tooling and the original backup are under ignored `output/`; the shipped app gains no dependency.
- Map behavior: [Google Maps sharing/embedding guidance](https://support.google.com/maps/answer/7101463?hl=en); demo city query embed only, no API key or account. Provider availability remains external; the direct link is always present.

## Remaining client requests

Requested homepage order, copy/removals, Specialist/Certifications labels, free-phone demo coordination, category Q&A, compact profiles, pricing removals and demo media/motion are implemented. Exact business pins still require public addresses. Replacement logo/font/color selections, final company film/story/captions/transcript, certification wording/verification policy and first-answer/free-call operating decisions require client input. Supabase/email/payments and the broader original backlog remain deferred as recorded in `updates/remaining-work.md`. No client approval or real integration is implied.

## Initial verification — 20 October

- `npm run typecheck`, full lint, focused final-file lint and `npm test`: pass; 92 unit tests. Final `tsc --noEmit` also passes after the browser-test navigation assertion.
- `npm run build:demo`: pass against final functional source. Default `npm run build` correctly rejects missing opt-in with exit 1; production guard unchanged.
- Affected `npm run test:e2e` run: 72 selected cases across desktop/tablet/mobile; 69 applicable scenarios pass across the main run and targeted correction, with 3 intentional viewport-specific skips. The main run had 68 passes and one existing Q&A navigation race; adding explicit public-route/title assertions before switching accounts resolved it, and all 3 viewport reruns passed. No assertions were removed or bypassed.
- All 15 new motion/map scenarios pass, including actual video playback, keyboard pause/resume, offscreen pausing, explicit play with reduced-motion/data-saving preferences, failed-video fallback, no-script/no-video-transfer behavior and deferred map loading. Map fixtures keep automated checks deterministic; a real Google city map was also loaded and visually inspected separately.
- Reviewed actual hero renders at 1440, 768, 390 and 320px plus a real map on mobile. No horizontal overflow or detected axe violations in final tested views. The initial opacity fade briefly reduced text contrast; replaced it with transform-only movement so text retains full contrast throughout. The initial no-script message was replaced with the existing readiness pattern to make it reliably visible.
- Search, profile eligibility/returns, inquiry validation, sample-photo isolation, public Q&A attribution, reviews/statistics and existing preview navigation regressions pass in the affected run. No credentials, database, payment/email integration or new dependency was added.
- Evidence: ignored `output/motion-*.log` and `output/playwright/motion-review-*`, `hero-motion-*`, `city-map-*`. Chromium emulation and automated checks do not replace physical-device/other-browser/production-performance verification.
- Updated both plain-language reports in `updates/` and the scope/checklist. Source follow-up is prepared for the previously authorized GitHub push; no Vercel deployment was run in this task.
