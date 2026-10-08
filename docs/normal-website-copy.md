# Website copy cleanup — 2026-10-08

The user requested normal website wording in place of demo/temporary labels. This scoped instruction supersedes older requirements to display prototype notices. Public pages, account selection, member/admin workspaces, moderation actions, validation messages and visible fixture descriptions now use normal product language.

Sign-in uses **Account email**, **Access code**, **Sign in**, **Administrator** and **Switch account**. The shared walkthrough code is now `home-access`. Business presets use Meadow Studio, Willow Studio, Pending Studio, Rejected Studio and Inactive Studio. Existing account IDs, routes and listing eligibility rules remain unchanged.

This is a presentation change. The accounts are still synthetic selections in React memory, not real authentication. Data remains in the current tab; refresh/reset clears it. No database, email, billing, upload, credentials, persistence or authorization integration was added. Delivery and booking confirmations retain truthful limits. Internal adapter names, reserved example addresses, fixture IDs and the production fail-closed configuration are preserved.

## Verification

- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build:demo` pass. All 85 unit tests pass, including an added assertion that sign-in preserves a selected admin review URL. Focused lint also passes after the final return-link correction.
- All 195 applicable Chromium browser cases passed across completed runs; nine existing viewport-specific skips remain. A full-suite attempt produced 119 passes before stopping on six failures. After correcting the selected-review return key and updating copy/reference assertions, the three affected desktop cases passed, followed by the complete tablet/mobile run: 128 passes and eight intentional skips. This was not one uninterrupted passing full-suite run.
- Visible wording checks passed for 13 public routes at each of three widths (39 page checks). Homepage, sign-in and admin screenshots were captured at desktop/tablet/mobile widths; representative captures and the final mobile validation screen were inspected. Files are in `output/playwright/normal-copy-*` and `output/playwright/phase-2f3-*`.
- Accessibility, overflow, prehydration/no-script states, safe return URLs, private projections, reset boundaries, absence of network mutations and absence of browser persistence are covered by the browser/unit checks. The production configuration guard remains covered by the unit suite. Physical devices, Safari and Firefox were not tested.
- `git diff --check` passes. No dependencies, integration services, push or deployment were added.

## Sign-in presentation refinement — 2026-10-08

The login page now uses a split brand/form card on desktop and a compact single-column card on tablet/mobile. Professional and Administrator choices explain the destination; account identity is still derived from the existing preset allowlist. Credentials for the other account type show an inline error instead of changing roles. Access codes are masked with an accessible show/hide control. Preset accounts are available inside a collapsed **Quick access** disclosure; selecting one fills the form and selects the matching account type. These remain session-only walkthrough accounts, not production authentication.

Typecheck, lint, all 85 unit tests and the demo build pass. All 33 focused Chromium sign-in/member/admin browser cases pass in one run across desktop, tablet and mobile, including account-type mismatch, masking, safe returns, keyboard/focus, no-script behavior, workspace flows and accessibility checks. The full unrelated browser suite was not repeated for this refinement. Desktop, tablet, mobile and 320 px screenshots were inspected in `output/playwright/login-redesign-*`; none has horizontal overflow.

## Separate member and administrator entry points — 2026-10-08

Public `/login` now has only professional sign-in and member shortcuts. `/admin/login` is the dedicated administrator page, with its own heading context, account filtering and no registration prompt. Query parameters cannot select an admin account on the member page. Both forms reject credentials belonging to the other account type. The public footer admin link and the role toggle were removed. Dashboard sign-in gates and sign-out use the appropriate login route; the existing internal Other workspace links remain for cross-account walkthroughs.

The owner opens `/admin/login` directly. Removing public links is presentation separation, not a security boundary: accounts still use synthetic fixtures in React memory, and Quick access remains available on the respective pages. Real owner access still needs server authentication, server-enforced roles and permission checks; public registration must never grant admin privileges. No production integrations were added.

Typecheck, lint, 86 unit tests and the demo build pass. Twelve focused desktop browser cases pass after correcting navigation timing in the shared test helper. Responsive workflow results are recorded below when complete. Screenshots for both routes at 1440, 768, 390 and 320 px were captured with no horizontal overflow; desktop, tablet and mobile renders were inspected in `output/playwright/separate-*`. A full-suite attempt was stopped after the helper failures; a complete full-suite pass is not claimed.
