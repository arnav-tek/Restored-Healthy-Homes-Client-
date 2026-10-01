# Phase 2A handoff

Superseded for current work by [Phase 2B handoff](phase-2b-handoff.md); the search/query contract below still applies.

Implemented 2026-09-30. Scope: demo homepage search and directory only. Stop before 2B or integrations. Continue using the existing authoritative overview/alignment; no new brand/font decisions.

## Behavior

- Homepage city/ZIP + all eight canonical categories + Search. Existing theme and modest hero retained.
- Directory keyword, category, city/ZIP, optional radius, A–Z/Z–A/nearest sorting, result count, six-result pagination and clear filters.
- Native GET forms work without JavaScript. URL is the source of truth for reload/back/forward. A small `SearchForm` client island resets restored browser drafts to server-rendered defaults on mount/history restoration. Submitting filters omits page and resets to 1; pagination carries other filters.
- Eligibility and public projection run first through `demoDirectory.listPublic()`. Search receives public DTOs only. No private account, billing or moderation fields are introduced.
- Keyword search requires every whitespace-separated term, case-insensitively, anywhere across business name, specialty, summary, services and category labels. It is a simple substring search, not fuzzy search.
- City/ZIP without radius means that city only. Radius includes cities within the unrounded great-circle distance. Nearest order uses unrounded miles and alphabetical/ID ties. Missing coordinates never count as zero; excluded from radius, sorted last for nearest, noted in results when relevant.
- Unsupported locations show a correction state, not nationwide results. Ambiguous Portland offers working OR/ME choices preserving filters and resetting page. Empty results offer broader-search guidance. Adapter failure keeps the search in the retry link.
- Cards retain honest service disclosures. No profile/contact links until 2B. No ratings, new verification claims or platform statistics.

## Query contract

| Parameter | Contract/default |
| --- | --- |
| `q` | Trim/collapse whitespace; max 100 characters; default empty |
| `category` | Exact stable catalog ID; default all |
| `location` | Trim/collapse whitespace; max 80 characters; supported city, city + state abbreviation, or exact five-digit demo ZIP |
| `radius` | Optional integer 1–500 miles; blank = same city; requires location |
| `sort` | `az` (default), `za`, `nearest`; nearest requires supported location |
| `page` | Integer 1–10000, default 1; beyond result pages redirects to last available page (1 if empty) |

Repeated known keys and malformed/out-of-bounds values show accessible errors and no results. Unknown keys are ignored. Successful searches redirect to canonical URLs: empty/default values removed, normalized values encoded, deterministic key order. Invalid inputs remain correctable; they never trigger an unfiltered fallback. Links are built only by `directoryHref`; no user-controlled redirect targets.

## Location adapter and limits

`src/data/contracts.ts::LocationAdapter` is replaceable. `src/data/demo/locations.ts` contains ten illustrative city centers and one example ZIP per city: Asheville NC 28801; Austin TX 78701; Portland OR 97201; Boulder CO 80301; Raleigh NC 27601; Madison WI 53703; Richmond VA 23219; Tampa FL 33602; Portland ME 04101; Round Rock TX 78664.

These rounded coordinates are demo fixtures, not a geocoded address/ZIP dataset. ZIPs reuse city centers. No external geocoder, browser geolocation, road distance, service-area determination, state-only or ZIP+4 search. City/state abbreviation matching tolerates case, whitespace and a comma. The UI lists supported inputs. Round Rock (no listing in that city) with radius 25 demonstrates nearby Austin; Raleigh radius 250/nearest returns Raleigh, Richmond, Asheville. Existing eight eligible/eight hidden fixtures remain unchanged.

Pure search/distance rules: `src/domain/directory-search.ts`, `src/domain/location.ts`. Boundary orchestration: `src/data/search-service.ts`; gated demo adapter invokes it. Validation: `src/validation/directory.ts`. No new dependencies, persistence, credentials or services.

## Checks

Passed: typecheck, lint, 17 unit tests, optimized demo build, and 26 browser tests (one intentional desktop mobile-menu skip). Default production build correctly rejected missing demo opt-in. Desktop/tablet/mobile screenshots were inspected; automated axe checks found no violations. Full results are in `docs/build-checklist.md`.

Unit coverage adds query bounds/repetition, city ambiguity/ZIPs, coordinate edge cases, radius inclusivity, missing coordinates, sorting/paging and eligibility-before-counting. Browser coverage adds homepage keyboard journey, URL history/reload, reset/clamping, radius/nearest, correction/empty/retry states and JavaScript-disabled form submission. Existing responsive/accessibility/menu/privacy checks remain. Browser testing is Chromium emulation only; physical devices and Safari/Firefox remain unverified.

## Remaining 2B work

- Individual professional profiles and working profile navigation with eligibility and public-field guarantees.
- Demo inquiry submission, validation and confirmation alongside profile content/empty/not-found states; no real email or delivery.
- Further homepage/content refinement only after review; do not add unapproved fonts or fabricated content.
- Real geocoding/service-area/radius policy, ratings and all backend/auth/payment/email integrations remain later work requiring their own decisions and verification.

The checklist now places demo member/admin workflows in Phase 2C, after demo profiles/inquiries and before real integrations. These phases have not started. Demo fixtures now declare explicit stable professional and category IDs, including excluded examples; catalog ordering no longer determines their associations. A regression test reverses the catalog before loading fixtures and checks all associations and category search results.

Follow-up checks passed: typecheck, lint, all 18 unit tests, demo build and 26 browser tests (one intentional skip). Existing UI and eligibility behavior are unchanged. Stopped before 2B.

No deployment. Local preview: `npm run build:demo` then `npm run preview` at http://127.0.0.1:3000, or `npm run dev` for editing.
