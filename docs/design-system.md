# Design direction — Phase 1

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
