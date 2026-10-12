# Design direction — Phase 1

## Rounded section labels — 2026-10-12

Use the client's existing Specialty pill as the shared section-label treatment: Arial 11 px, a fine clay outline, 9999 px radius and 3 px / 12 px padding. Retain the sage/cream/clay palette, existing Georgia headings and section spacing. Use cream text and a quiet cream outline on sage backgrounds. Labels size to their text, wrap within narrow columns and remain non-interactive.

Pre-edit review: replace only section eyebrows and their decorative lines; retain category/status badges, content dividers and working controls. A shared CSS class avoids separate page treatments. No new fonts, cards, copy or motion.

Implemented 39 shared section labels and removed 16 decorative label lines. Verification: typecheck, lint, 89 unit tests and demo build passed; 67 affected browser cases passed with five intentional viewport skips across home/About, education/pricing, resources/public pages, consultations, sign-in and directory/workspace shells. Playwright inspection covered 44 route/viewport combinations across 18 routes at 1440/768/390/320 px with rounded borders, no label lines and no horizontal overflow. Desktop/tablet/mobile screenshots were reviewed in `output/playwright/section-tags-*.png`. Default build still fails closed without demo opt-in.

The visual reference was inspected in-browser on 2026-09-30. Retain its sage gradients, Georgia headings, cream surfaces and terracotta actions. Do not reuse its unsupported statistics, testimonials, categories or verification claims.

## Direction before implementation

Professional discovery comes first. A modest, left-aligned home introduction leads directly to the directory. The directory uses a category sidebar and a two-column card grid; mobile uses a labeled native category selector with a real Apply button. Dashboards use a shared compact shell and structured status rows/table.

```text
Home:      brand / navigation
           short introduction | useful category entry points
           directory action / what to expect
Directory: title / demo context
           category list | result count
                         | two-column professional cards
Mobile:    brand / menu, title, category form, one-column results
```

- Colors: sage dark #3D5C3B (navigation, primary actions), sage #5C7A5A (gradient ends), cream #F5F0E8 (page), brown #3B2A1A (text), terracotta #B3622F (accent). Dark terracotta #984B22 for small text and white-text buttons with better contrast. White #FFFEFB for raised surfaces.
- Type: Georgia headings (48–60 px home desktop, 36–44 px page, 23 px cards; 34–40 px mobile); Arial body/controls at 16 px, labels at 14 px. Body leading 1.6. Headings 1.12–1.25. Dashboard title 34 px.
- Spacing: 4, 8, 12, 16, 24, 32, 48, 64 px. Content width 1200 px, body prose about 65 characters. Page gutter 24 px desktop / 20 px mobile.
- Borders: warm #DCDDD0, 1 px. Cards radius 10 px; buttons 6 px. Sparse shadows on the hero search/action area only.
- Interaction: sage hover, clear 3 px focus ring with offset; links underline on hover. Controls >=44 px high. No automatic motion. Reduced-motion disables transitions and smooth scrolling.
- Icons: Lucide only, decorative icons hidden from assistive technology; accessible text for icon-only controls. Existing RHH text mark from reference is retained without inventing a new logo.
- Cards: category, business, city/state, specialty, sample verification, expandable services preview. No fake contact/profile buttons, reviews, or ratings. Full profile experience is next milestone.

## Brief review

Cream/serif/terracotta are deliberate client requirements. We retain them even though generic design guidance cautions against these defaults. No image is needed for this foundation; typography, accurate information and useful controls carry the design. Native select and details are appropriate here; shadcn would add no useful behavior yet.

## Verification

Phase 2A extends the same palette, Georgia/Arial type, spacing and card treatments. Replace the homepage's right-hand category shortcuts with a compact cream search panel. Use a stacked filter form in the desktop directory sidebar and a two-column form above results on tablet (one column on mobile). Keep a clear Apply filters action, labels and inline errors; paginate below cards. No new fonts, imagery or visual identity changes.

Reviewed all four implemented pages at 390, 768 and 1440 px. Automated checks cover navigation, focus, menu dismissal, filtering, overflow and accessibility. Visual review caught and corrected mobile admin-table overflow; its table now scrolls within the content area. Actual results and limits are recorded in build-checklist.md.

Phase 2B extends this direction: a left-aligned profile heading and long-form business details beside a compact paper-colored inquiry panel; stack details and form on mobile. Reuse the sage/cream/brown/clay tokens and Georgia/Arial pairing above. Keep sample labels, credential distinctions and demo-only submission guidance visible. No new fonts, statistics, imagery or review claims.

Phase 2C-1 retains the same typography, palette and panel treatments. Use two columns for short application fields/category choices on desktop, one on mobile; use a single column for descriptions. The member view separates status, editable details, public-facing preview, subscription and fictional inbox. Editing opens through a native disclosure to keep the overview readable. No new imagery or fonts.

Phase 2C-2 uses the same tokens and workspace shell. The application register uses two-column cards on desktop and stacked cards on mobile. Review details and short decision controls follow the register; category labels use a native disclosure, with an explicitly separate directory preview below. Native confirmation dialogs identify affected businesses/claims. No new fonts, icons, dependencies or visual identity changes.

Phase 2D replaces the long workspace pages with focused views. A sticky desktop rail groups section links above the separate demo-workspace link and secondary reset; below 820 px, a native disclosure holds the section menu. Overview numbers come only from current session records. Admin registers use native tables inside their own scroll regions, with business links first. Status summaries place approval, subscription, suspension and eligibility together. Retain existing sage/cream/clay/brown tokens and Georgia/Arial fonts; no charts, decorative images or new motion.
Phase 2E-1 keeps the same typography and colors for public Q&A. Questions use a separated reading list; answers have a quiet sage edge and clear fictional attribution. Forms reuse existing controls, field errors and focus treatment. The public header now uses its disclosure below 1050 px to accommodate Ask a Specialist; workspace navigation still changes below 820 px.

## Phase 2H-1 direction

Retain sage #3D5C3B, cream #F5F0E8, brown #3B2A1A, dark clay #984B22 and paper #FFFEFB, with Georgia headings and Arial controls/body. Keep the existing 1200 px container and spacing scale. The search-led hero remains the strongest element; the rest uses quiet, left-aligned sections without new imagery, motion or gradients.

```text
Home:  introduction | search
       eight catalog links in two columns
       compact demo statistics
       three sequential visitor steps
       questions | consultations | business application
       purpose introduction / About Us
About: introduction
       client story | provisional purpose
       video heading | static asset placeholder
       browse / apply
Mobile: stack sections and category links; keep controls full-width where needed
```

Brief review: category links use compact open rows instead of eight decorative cards; the three numbered steps are an actual sequence. Statistics describe sample data, not marketing traction. About Us content is explicitly provisional and the video area has no playback control until an approved asset exists. Shared navigation collapses before the extra About Us link crowds account actions.

## Phase 2H-1 visual refinement — 2026-10-06

The user requested a presentation redesign within the completed functional phase. This supersedes the original 2H-1 layout direction above, while preserving its data and workflow boundaries.

Following the user's 2026-10-07 preference, the sage hero uses two desktop columns: introduction on the left and a search card with stacked fields on the right. At 820 px and below the sections stack; tablet uses two fields above Search and mobile stacks the controls before secondary browsing. Existing copy and all sections below the hero are retained. Eight catalog categories form four columns at wide widths, two through tablet and single compact icon/text links on mobile. Icons are mapped by immutable IDs in the presentation layer; catalog copy remains shared.

A sage statistics panel separates the directory snapshot from the surrounding cream page. Large numerals, contrasting labels and one shared fictional-data/location disclaimer keep the figures readable; a native disclosure holds definitions. Below it, an editorial introduction and directory link sit beside a vertical numbered sequence. Mobile stacks both the statistics and journey introduction, preserving generous text and control sizes. A quiet sage Q&A spotlight sits beside a lighter consultation introduction. An editorial purpose introduction leads to About Us, followed by the sole large professional application CTA on sage.

About Us pairs its heading with a serif introduction, puts the company-story slot beside a responsive video frame, gives purpose copy a separate clay-edged paper treatment and finishes with a composed directory invitation. All pending content remains labeled; the supplied-video branch retains native controls, captions/transcript support and no autoplay. No media was invented.

The footer now groups visitor and professional/workspace links, with a concise bottom demo notice. The shared brand can reflow under text enlargement; the mobile menu keeps a viewport-bounded scrolling area. Existing fonts, palette, control sizes and focus behavior remain. Obsolete home-only hero/path styles were removed after checking their usages; the home/About block was refactored rather than layered with contradictory overrides.

Visual client/user approval and final company copy/media remain pending. Browser evidence and actual checks are recorded separately in the Phase 2H-1 handoff and checklist.


## Public copy cleanup - 2026-10-07

At the user's request, repeated demo/preview badges, banners and template instructions are removed from the public site. Public headings, buttons, review counts, metadata and validation messages use concise labels. Form-local messages still describe actual delivery, payment and session-lifetime behavior. About story/video slots use coming-soon copy; no company history or media was invented. Synthetic source records, account selection and workspace-specific explanations remain separate from this presentation cleanup. The restored two-column hero and the new statistics/journey layout remain in place.

## Phase 2H-2 design plan


Extend the refined public pages with a two-column introduction, compact native education disclosures and a two-column membership comparison. Reuse Georgia/Arial, sage/cream/clay tokens, existing buttons and spacing. Category names and prices come from the shared catalog; editorial pathways use stable IDs. Keep limitations beside the relevant information and application actions.

Pre-edit critique: eight expanded pathways or repeated pricing cards would make comparison slow and the pages unnecessarily long. Use an anchor index, keyboard-operable disclosures and aligned prices instead. Check long category names, signed-in navigation, narrow screens and visible focus; no new imagery, fonts or motion.

### Hero statistics placement — 2026-10-07

The single directory snapshot now sits directly beneath the desktop hero description, beside the unchanged search panel. At 820 px and below it follows search. Three compact columns use shared label/value grid rows, aligned numerals, cream decorative stars and a published-review count. Mobile column widths keep labels readable at 320 px. The native “How these figures work” disclosure holds the eligibility, rating and state definitions. The separate statistics surface below category browsing is removed; calculations still come from the existing tab session.

## Hero statistics compact refinement — 2026-10-07

Plan and critique: keep the existing sage/cream palette and Georgia/Arial type, with three aligned definition-list columns. Remove the vertical rules and their padding; reduce the number scale and put stars beside review count where space allows. The previous stretched rules and three rating rows made this supporting information too prominent. Preserve live calculations, label/value alignment, keyboard disclosure and mobile placement after search; no extra decoration or new state.

### Category hover refinement — 2026-10-07

Category cards retain their light border on hover and fade the sage background in and out over 200 ms with ease-in-out timing. Keyboard focus remains visible through the shared focus indicator; the existing reduced-motion rule disables the transition.

The category arrow also moves 2 px upward and right on hover or keyboard focus, returning with the same 200 ms ease-in-out timing. Reduced-motion users retain a stationary arrow.

Arrow follow-up validation: typecheck, lint, all 81 unit tests and demo build passed. Live browser styles confirmed the (2, -2) px hover translation, return to no transform on pointer exit, and no transform or transition with reduced motion enabled. Reviewed output/playwright/category-arrow-hover-desktop.png. The scoped homepage E2E command could not start because the existing preview occupied port 3100; that run is not reported as passing.

Validation: typecheck, lint, 81 unit tests and demo build passed; the default production build rejected missing opt-in. Reviewed desktop hover and tablet/mobile screenshots in output/playwright/category-hover-*.png; browser computed styles confirmed no hover outline, the unchanged light border and the 200 ms ease-in-out transition. Full end-to-end verification was attempted but interrupted by concurrent workspace builds and preview-server shutdowns; it is not a passing result.

### Hero statistics compact white trust bar — 2026-10-07

The hero statistics block beneath the hero description is redesigned as a compact white trust bar card:
- White raised surface (`#ffffff`) with subtle border (`#dce3db`), soft rounded corners (`12px`), and light elevation shadow.
- Exactly 3 stats displayed in one horizontal row on desktop and tablet:
  1. Professionals: 28px bold Georgia serif numeral in dark green (`#244528`) with 13px clean sans-serif label below.
  2. States represented: 28px bold Georgia serif numeral in dark green (`#244528`) with 13px clean sans-serif label below.
  3. Average review rating: 28px bold Georgia serif numeral + inline star icons in dark green (`#244528`) with 13px clean sans-serif label below.
- Subtle 44px vertical dividers separate the three stat items without reaching the card borders.
- The published review count (e.g. "6 published reviews") is removed completely from visual display, retaining screen-reader text for assistive technology and test parity.
- On mobile (<= 560px), stats stack cleanly and vertically with compact padding and subtle horizontal dividers, ensuring responsive reflow down to 320px without overflow.

### Explore Restored Healthy Homes two-card refinement — 2026-10-07

Redesigned the feature section beneath the visitor journey into two balanced, premium horizontal cards:
- Section header retains "WAYS TO GET STARTED" with a terracotta kicker accent line, the Georgia serif headline, and introductory paragraph with directory and education pathway links.
- Two equal-width cards in one row on desktop (`grid-cols-2`), stacking vertically on tablet and mobile:
  - **Ask a Specialist**: soft pale sage surface (`#ebf2ea`) with subtle sage border, soft shadow, circular icon badge (`MessageSquare`), uppercase category label in dark green (`#244528`), large Georgia serif headline (`24px`), concise copy, solid dark green CTA button (`#284c2d`), delicate botanical leaf line-art accent, and a lifestyle interior image with an organic curved arch crop (`border-top-left-radius: 110px`).
  - **Consultations**: soft warm off-white surface (`#faf8f5`) with subtle warm border, soft shadow, circular peach icon badge (`Calendar`), uppercase category label in dark green, large Georgia serif headline, concise copy, solid warm terracotta CTA button (`#984b22`), and a natural limestone/wood home exterior image with an organic curved arch crop.
- Fully responsive across desktop, tablet (768px), mobile (390px), and narrow viewports (320px) without horizontal scrolling. Validated with Axe WCAG 2.1 AA accessibility checks.

### About, For Professionals CTA, and Footer redesign — 2026-10-07

Redesigned the lower homepage and site-wide footer following the editorial brand style and visual prototype:
- **About Section**:
  - Two-column grid layout on desktop, stacking gracefully on mobile.
  - Left column: terracotta horizontal accent line rule (`20px`) with uppercase bold terracotta eyebrow (`— ABOUT US`) and large Georgia serif heading ("Different specialties. One place to begin.").
  - Right column: readable sans-serif description copy and a clean dark-green text link (`About Us →`) leading to `/about`.
- **For Professionals Card**:
  - Replaced the simple full-width green band with a spacious rounded dark-forest-green card (`#244629`, `border-radius: 24px`, soft elevation shadow) centered within the container.
  - Left CTA column: pale sage accent line with uppercase eyebrow (`— FOR PROFESSIONALS`), white serif heading ("Bring your specialty to the directory."), light-sage body description, and a solid white pill-button (`List Your Business →`) with dark green text.
  - Subtle vertical divider (`rgba(255, 255, 255, 0.16)`) separating the CTA column from the benefits.
  - Right column: 3 compact benefit columns with white circular icon badges:
    1. **Reach homeowners**: `Users` outline icon, white serif heading, and focused description.
    2. **Showcase your work**: `FileText` outline icon, white serif heading, and focused description.
    3. **Be part of a trusted community**: `Sprout` outline icon, white serif heading, and focused description.
  - Responsive reflow: transitions cleanly on tablets (`<= 1024px`) with a stacked card layout, and stacks benefits vertically on mobile (`<= 560px` down to `320px`).
- **Footer**:
  - Upgraded to a clean 4-column layout on desktop:
    1. Brand mark & logo with brand tagline ("Thoughtful connections. Healthier places to call home.").
    2. **Explore** column with preserved navigation links (`Find professionals`, `Ask a Specialist`, `Consultations`, `Education`, `About Us`).
    3. **For professionals** column with preserved links (`Membership pricing`, `List Your Business`, `Sign in`, `Member area`, `Admin area`).
    4. **Stay connected** column featuring short introductory copy, an accessible client-side newsletter email input with submit button and confirmation state, plus clean outline social links (`Instagram`, `LinkedIn`, `Facebook`).
  - Thin divider separating the top grid from the bottom row.
  - Bottom row with copyright notice on the left (`© {year} Restored Healthy Homes`) and legal links on the right (`Terms · Privacy · Contact`).
  - Implemented dedicated Server Component pages for `/terms`, `/privacy`, and `/contact` to avoid 404s and keep navigation robust.
  - Verified with Axe WCAG 2.1 AA accessibility checks, zero horizontal overflow across 1440px/768px/390px/320px, and full Playwright test suite passes.

### How it works 3-card redesign — 2026-10-07

Redesigned the "How it works" section into a 2-column layout matching the prototype:
- **Left Column**:
  - Eyebrow: `HOW IT WORKS` with a thin horizontal rule extending rightward.
  - Heading: Large Georgia serif heading ("A clearer path to your next step.") in deep dark green (`#244528`).
  - Supporting text: "Find, explore, then start a conversation."
  - Solid warm terracotta CTA button: "Find professionals →" with arrow, rounded corners, and warm elevation shadow.
- **Right Column**:
  - 3 stacked white cards (`#ffffff`) with subtle border (`#e2e8df`), soft elevation shadow, and `18px` rounded corners.
  - Each card layout:
    1. Large circular step number badge (`01`, `02`, `03`) with a soft warm cream fill (`#f4efe6`) and bold serif terracotta numerals.
    2. Thin vertical divider separating the number from the content.
    3. Georgia serif step headline ("Find a specialty", "Explore a profile", "Start an inquiry") and clear sans-serif supporting text.
    4. Small circular pale sage icon badge (`#ebf2ea`) on the right featuring dark green outline icons:
       - 01: `Search`
       - 02: `FileText`
       - 03: `Send`
  - Subtle vertical connector line between cards with a centered terracotta circular node between step 01 and 02, and between step 02 and 03.
- **Responsive reflow**:
  - Tablet (`<= 820px`): single-column layout with stacked cards.
### Homepage section spacing harmonization — 2026-10-07

Harmonized vertical spacing across all sections on the homepage to create a cohesive editorial rhythm:
- **Consistent Inter-section Distance**:
  - Desktop: Exactly `80px` visual spacing between every section transition and inside full-bleed background bands.
    - Hero bottom to Category Browse: `80px` (`padding-top: 80px`).
    - Category Browse cards to How it works: `80px` (`category-browse-section padding-bottom: 40px` + `home-journey padding-top: 40px`).
    - How it works cards to Ways to get started band: `80px` (`home-journey padding-bottom: 80px`).
    - Ways to get started band interior: `80px` top and `80px` bottom (`home-features-band .home-section padding-block: 80px`).
    - Ways to get started band to About Us: `80px` (`home-about padding-top: 80px`).
    - About Us to For Professionals card: `80px` (`home-about padding-bottom: 40px` + `home-business-section padding-top: 40px`).
    - For Professionals card to Footer: `80px` (`home-business-section padding-bottom: 40px` + `site-footer margin-top: 40px`).
  - Tablet (`<= 820px`): Uniform `56px` visual spacing across all sections (`28px` between contiguous unbanded sections).
  - Mobile (`<= 560px` down to `320px`): Uniform `44px` visual spacing across all sections (`22px` between contiguous unbanded sections).
- **Quality & Accessibility**:
  - Full WCAG 2.1 AA accessibility checks pass with 0 violations.
  - Zero horizontal overflow across all tested viewports.
  - All unit (81/81) and end-to-end tests passing.

### List Your Business Application Page Redesign — 2026-10-10

Redesigned the public application page at `/list-your-business` to deliver a clean, editorial, and trustworthy experience matching the brand aesthetic:
- **Header & Notice**:
  - Small uppercase section label (`FOR HEALTHY-HOME PROFESSIONALS`), large Georgia serif title (`List Your Business`), and quiet supporting text.
  - Full-width soft-sage notice pill with Info icon (`Prepare your business details for review. Application delivery is not connected yet.`).
- **Application Card**:
  - Centered white rounded container (`max-width: 960px`, `border-radius: 16px`, `padding: 32px 32px 36px`, subtle border & shadow).
  - 2-column introduction header inside the card:
    - Left: Georgia serif heading (`Your business`) and required-field helper text.
    - Right: Soft-sage highlight panel (`#f3f6f0`) with circular outline badges for directory reach (`Users`), team review (`FileText`), and demo notice (`Eye`).
- **Business Fields**:
  - Two-column form layout (`Your name` | `Business name`, `Contact email` with trailing envelope icon | `Phone (optional)`, `Website (optional)` spanning full width, `City` | `State`).
- **Professional Categories**:
  - Subtle divider line, Georgia serif section legend (`Professional categories`), and explanatory text above the grid.
  - 2-column grid of selectable cards with native checkbox, category title, and individual monthly price (`$79 / month`, `$129 / month`, `$200 / month`).
  - Active selection state with soft sage background (`#f3f7f1`) and green border (`#2b5431`).
  - No combined price calculations per multi-category billing invariants.
- **Business Details & Submission**:
  - Subtle divider line, full-width textareas for `Services`, `Business description`, `Healthy-home practices`, and `Listed credentials (optional)` with clear placeholders and helper text between labels and inputs.
  - Full-width dark forest-green submit button (`Create application`, `#284e30`).
  - Below card: Compact `Reset workspace` button with rotate icon and disclaimer text.
- **Verification**:
  - Full WCAG 2.1 AA accessibility checks pass with 0 violations across desktop, tablet, and mobile.
  - All 86 unit tests, demo builds, and end-to-end tests passing without regressions.


