# Featured homepage and billing demonstrations — 23 October 2026

This extends the public-listing journey using only the existing tab-local React session. No Supabase, authentication, card collection, gateway, email, upload, storage or live payment integration was added. Reload/reset clears accepted outcomes; new tabs start independently. Keep the walkthrough in one tab and use site links.

## Phase 1: public featured examples

Admin Featured controls update the homepage for explicitly linked public profiles (Fern & Field, Cedar Path and Hearthside) and the accepted submitted application. Eligibility is always approved + active membership + no suspension, independently of entitlement. Disabling entitlement or losing eligibility removes a linked card; its entitlement survives payment failure, cancellation, rejection or suspension. Successful demo payment cannot approve or reinstate a listing.

The homepage receives only public repository DTOs and initial featured IDs. A domain selector applies session eligibility/entitlement, preserves public catalog order and appends the eligible submitted application. It does not sort search results, sell priority or define final ranking. Existing cards retain the website design and working full-profile links. The Fern session seed now matches its initially featured public fixture. Softwood remains an independent seeded public example. Unlinked workspace-only studios stay in the admin preview, with explanatory copy and instructions to use a linked record/application; no synthetic dead profile links are invented. Canonical directory/profile fixture contents retain their existing behavior.

Submitted cards use the existing explicit public card allowlist. Application owner/contact email, moderation notes, billing attempts and entitlement internals never enter these cards or server page props. Server-rendered/no-script output retains the initial public examples. Missing public repository data excludes canonical examples; an eligible tab-local application is still independently projected.

## Phase 2: billing walkthrough

In a member account, open Membership:

1. Inactive/canceled/trialing: Start simulated checkout. Active: Try a renewal scenario. Past due/unpaid: Review recovery.
2. Review a single category's reference monthly USD rate and a $0 demo charge. Choose successful or failed payment; nothing is attempted externally. Success sets active; failure sets past due. Leave checkout/recovery to keep the status.
3. Review cancellation, then Keep current status or Confirm simulated cancellation. Confirmation sets canceled immediately for this example; no refund, renewal date or real invoice is created. A canceled account can restart checkout.
4. For an approved submitted application, check its directory/full profile and featured homepage card after success, failure, recovery and cancellation. All publication gates still apply.

Multi-category pricing and real lifecycle/grace/refund policies remain undecided. Each example uses one actual selected category's immutable ID/explicit billing mapping/reference rate, never a label-derived or combined amount. Added-category rates are labeled previews. The scenario changes the demo record's overall membership status without changing its specialty selection; this does not define real multi-category subscription behavior.

`src/domain/billing-demo.ts` owns typed fixed commands and transition checks. The existing shared reducer remains the only accepted-state writer. Commands require the matching fictional member identity; admin controls remain separate and cannot be invoked through member billing actions. Attempts capture a revision token, prior status and category price/mapping. Results reject stale/repeated attempts, wrong stage/owner/category and invalid outcomes. Profile edits and admin membership scenarios clear that record's billing screen. Sign-out clears unfinished reviews but retains accepted membership outcomes; reset/reload clears everything. No browser storage or real authorization is used.

The member island reuses the existing sage/cream/clay palette, Georgia/Arial typography, panels and buttons. Readiness/navigation guards disable mutations before hydration or while navigation is pending. Result headings receive keyboard focus after transitions; public links and workspace navigation retain their existing focus behavior.

## Verification

- Phase 1 selector tests: 2 passed before billing implementation.
- Combined domain checks: all 9 new tests passed. Typecheck, lint and all 120 unit tests passed; demo build passed before browser verification.
- Full Chromium run: 306 configured cases, 291 passed, 13 intentional skips and 2 desktop interruptions. Both failed because of browser `ERR_NETWORK_CHANGED`; the dashboard trace shows a failed RSC fetch falling back to full navigation, correctly clearing the demo identity. Both affected tests passed on a focused rerun (57.9 seconds), verifying all 293 applicable cases across completed runs. No source/test relaxation was needed for these transport failures.
- All 10 applicable new featured/billing cases passed in the full run (2 intentional viewport skips). These cover linked entitlement removal/addition, suspension despite payment success, application checkout/failure/recovery/cancellation, profile links, cancellation back, keyboard focus, drafts/navigation/reset, no storage/network mutations/private projection, 320px enlarged text and no-script fallbacks. The initial focused run passed 3 cases; its fourth asserted the hydrated gate in a no-script context. Correcting that assertion to the existing Checking session/Enable JavaScript fallback passed in the full run.
- Desktop 1440px, tablet 768px and mobile 390px rendered screenshots reviewed, including checkout, recovery and cancellation; 320px enlarged text also inspected. No detected axe violations or horizontal overflow in the new audited states. This is not physical-device or production payment verification.
- Default `npm run build` correctly rejected missing demo opt-in; `npm run build:demo` rebuilt successfully. The first final-preview startup encountered a concurrently replaced build directory and was retried after the build completed. The final affected run over the latest shared homepage/admin/billing source had 34 passes, 2 intentional skips and 3 artifact failures: another shared run deleted trace files during context cleanup (`ENOENT`). An isolated build copy, separate ports 3120/3121 and separate artifact directory verified all 3 unchanged interrupted cases (42.7 seconds), completing all 37 applicable affected cases across these runs. This is not one uninterrupted all-green run. No production source or test assertion was weakened for these environment/artifact interruptions.
- Local walkthrough health check: HTTP 200 at `http://127.0.0.1:3000/demo/walkthrough`. No deployment or push performed.
- Final post-verification typecheck and lint both passed again; `git diff --check` passed. Logs: `output/featured-billing-ready-typecheck.log`, `output/featured-billing-ready-lint.log` and `output/featured-billing-diff-check.log`.

Evidence: ignored `output/featured-billing-final-check.log`, `output/featured-billing-full-e2e.log`, `output/featured-billing-network-rerun.log`, `output/featured-billing-production-guard.log`, `output/featured-billing-ready-build.log`, `output/featured-billing-final-affected-e2e.log` and `output/featured-billing-isolated-rerun.log`; original transport-failure traces preserved in `output/featured-billing-network-evidence/`. Rendered screens are `output/playwright/featured-billing-*.png`. The isolated configuration/build/output live under ignored `output/featured-billing*`. Unrelated shared homepage/media changes were preserved; final focused checks cover the rebuilt latest homepage source.

Existing confidential overview/alignment documents and local `.agents/skills` files were unavailable in this checkout. The supplied AGENTS instructions and checked-in handoffs governed this scoped implementation; no missing confidential content was reconstructed. Local installed Next.js server/client guidance was read. No dependency installation, deployment or GitHub push was needed.

## Still deferred

Client approval of final ranking/upgrade terms, billing start/cancellation/grace/refund policies and multi-category billing; real accounts, ownership checks, RLS, durable records, server-validated price/entitlement operations, Stripe checkout/webhooks/reconciliation and renewed security tests. Demo success buttons must never become a production payment authority. Refer to the architecture and remaining-work report before scoping integrations.
