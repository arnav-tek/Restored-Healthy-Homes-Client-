# Client showcase fixes — 26 October 2026

Follow-up to [the published-site review](client-showcase-review-2026-10-26.md). Preserve the existing sage/cream/clay palette, Georgia/Arial typography, two-column desktop hero and responsive page structure. No dependency, real service or production-mode change.

## Changes

- Admin Q&A queue links participate in a tracked navigation transition. Filters are disabled until that queue commits, preventing a stale Questions filter from replacing an Answers navigation. Links retain normal modified-click behavior; filter defaults reset with the queue.
- Hero copy restores the requested health-practitioner/families wording without adding an unsupported blanket certification claim.
- Sign-in explains fictional presets, warns against real credentials and states the memory-only boundary immediately before the inputs. Reviews and homepage figures have nearby sample-data labels.
- Hero video plays one 4.5-second introduction, then retains a still frame without looping or restarting on scroll/visibility changes. This preserves the earlier no-controls preference. Reduced-motion/data-saving, unavailable media and no-script fallbacks remain static.
- Certifications opening animations move text without changing its opacity, retaining contrast throughout.
- SVG/32px/64px ICO assets reuse the existing RHH monogram; these do not claim to be the client's final replacement logo.
- Owner guide reconciles accepted public edits, inquiry routing, categories/pricing, eligibility, saved photos and reset/sign-out behavior.
- Privacy smoke coverage now distinguishes an explicit public sample contact from private fixture contacts/notes/billing IDs. Demo-label assertions are positive; accessibility/ownership assertions remain. A delayed-navigation regression checks disabled filters and the final Answers queue.

## Verification

- Typecheck, zero-warning lint, all 126 unit tests and demo build pass. The default production build still rejects missing live opt-in; no guard change.
- Affected `npm run test:e2e` selection: **47 passed, 4 intentional viewport skips** across desktop/tablet/mobile (7.2 minutes). All five previously failing desktop checks now pass; the interrupted Q&A moderation assertions complete. The new delayed-navigation regression passes in all three viewports. Hero playback is checked to stop within five seconds, remain still after returning to view, and retain all existing static/error/media fallbacks.
- Focused installed Edge follow-up: **4/4 passed**, covering demo sign-in/keyboard use, bounded media, favicon/public-data boundaries and delayed queue navigation. This complements the affected Chromium run rather than claiming a new full-suite or full multi-engine run.
- Inspected fresh desktop hero, tablet sign-in, mobile admin sign-in/reviews and 320px open Certifications renders; no overflow in the inspected views. An initial manual screenshot caught native scrolling in progress; the settled capture confirms the header remains at the top and the panel is readable. Tested accessibility assertions pass, including during opening text movement. Physical devices, Safari/Firefox and assistive-technology acceptance remain separate.
- `git diff --check` passes. No dependencies, browser storage, private projection fields or submission endpoints were introduced. The first ignored runner config used the config directory as its working directory; correcting `cwd` allowed the actual completed run above. No application bypasses or removed ownership/accessibility assertions.

Logs/screenshots use ignored `output/showcase-fixes-*`, `output/playwright/showcase-fixes-*` and `.codex/showcase-fixes*.playwright.config.ts`. GitHub/Vercel demo publication follows these checks; the final source commit and hosted URL are reported in the conversation. The original hosted baseline audit remains recorded separately rather than rewritten as an all-green historical run.

## Remaining boundaries

Fictional React state still exists only in one tab; refresh/reset clears it. Sign-out clears drafts but retains accepted records. Real authentication, persistence, email, Stripe, uploads, final content/policies and launch acceptance remain deferred. Member featured-upgrade and payment-method-management screens are not part of this repair. No real account, delivery, charge or booking is implied.
