# Member and admin dashboard spacing — 14 November 2026

Presentation changes only: separate member shortcut titles from descriptions;
align metric labels and helper text; give headings, fieldsets, form hints and
category editors consistent spacing; remove empty error/status spacing; and
make Q&A filters, question cards and review queues readable at narrow widths.
The connected admin navigation now uses separated, wrapping links, and member
navigation shares its spacing and minimum link height. Connected application
lists and account onboarding receive scoped spacing too.

No authentication, application actions, database migrations, environment values,
Supabase settings, payments or email behavior changed. No shared database was
accessed. This work PC still runs the local demo configuration.

## Tab coverage

Browser navigation, screenshots and page overflow checks covered all tabs at
1440, 768 and 320 pixels (60 tab/viewport combinations):

- Member: Overview, Profile, Inquiries, Membership, Q&A, Consultations, Reviews.
- Admin: Overview, Analytics, Membership, Featured, Content, Certifications,
  Applications, Listings, Credentials, Categories, Q&A, Consultations, Reviews.

All 60 combinations had no page overflow or browser JavaScript errors. After
the Q&A/review/filter refinements, 15 affected combinations were checked again.
Application, credential, Q&A, review, resource creation and membership detail
views were additionally checked at 1440 and 320 pixels without page overflow.
Screenshots and check scripts/results are under ignored `output/spacing/`.

The actual connected navigation and empty member/admin account components were
rendered independently with synthetic empty data and the compiled stylesheet.
All six 1440/768/320 renders had no overflow, and navigation links met the
44-pixel minimum height. These are component layout checks, not live account,
authentication, database or integration acceptance.

## Validation

- Type checking and zero-warning lint passed.
- All 198 unit tests passed.
- Optimized demo build passed.
- Focused browser regressions: **22 passed, two existing skips**, zero failures
  across desktop/tablet/mobile (5.1 minutes). Covers dashboard navigation/history,
  retained drafts/reset confirmations, member application/editing, admin editor
  reflow, long-text/errors/accessibility, Q&A drafts and review moderation.
  The enlarged-text admin-editor test runs once in the desktop project at its
  own narrow viewport; its tablet/mobile duplicates are intentionally skipped.
  Log: `output/spacing/e2e-focused.log`.
- An initial broad browser run was interrupted to focus verification on this
  dashboard change; no full 369-test-suite pass is claimed.
- `git diff --check` passed. Development server restored on port 3000; homepage
  HTTP 200 verified. No commit, push or deployment performed.

Focused command:

```sh
npm run test:e2e -- tests/e2e/dashboard.spec.ts tests/e2e/member.spec.ts tests/e2e/admin-showcase.spec.ts tests/e2e/admin-completion.spec.ts tests/e2e/qa-moderation.spec.ts tests/e2e/review-moderation.spec.ts --grep 'dashboard|public application, keyboard|member drafts remain|review filters, missing|admin showcase overview|remaining admin editors' --max-failures=5
```

The private project overview/alignment files and installed project-local skill
subtree referenced by AGENTS.md are absent from this checkout. Existing source,
handoffs and the requested presentation-only scope guided these edits.

## Outlined-label follow-up — 14 November 2026

Standardized section-label vertical padding and line height, including the
homepage Specialty pill. Increased sidebar label-to-navigation spacing to
12 pixels. Fixed labels touching headings in the About Us purpose/closing
sections, education closing banner, membership walkthrough and admin showcase.
The education banner's paragraph rule now excludes section labels so it cannot
override their type size, color or spacing. Consultation offer/process and
application labels also have at least 12 pixels before their following heading.

Checked section-label computed styles across public, login, application and
walkthrough pages at desktop/mobile widths. Additionally captured 24 public and
member/admin page/viewport combinations at 1440/320 pixels, including wrapped
long labels and repeated membership/featured/content labels. No tag clipping or
page overflow was found. Evidence: ignored `output/spacing/pills-*` and
`tags-after-*`. This remains a stylesheet-only follow-up.

Follow-up verification: optimized demo build passed; eight selected public
page/education/pricing browser regressions passed, with two existing skips for
duplicate mobile runs of desktop-driven 320px/enlarged-text checks. Zero failures;
log `output/spacing/pills-e2e.log`. `git diff --check` passed.
