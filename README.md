# Restored Healthy Homes

A demo platform that helps people find professionals who support healthier homes.

- Search eight professional categories by keyword, category, city or ZIP.
- Browse the complete demo homepage with derived directory statistics and an About Us layout awaiting final client story/video assets.
- Explore public business profiles and try a demo inquiry form.
- Read fictional reviews and star ratings, submit a session-only review, then try admin moderation and linked professional review views.
- Browse fictional Q&A, submit demo questions and member answers, and try admin moderation.
- Explore free phone consultations, submit a session-only request and try admin assignment/member coordination; no booking, payment or notifications.
- Submit a sample business application and edit it in the member workspace.
- Review applications, credentials and listing eligibility in the admin workspace.
- Try fictional professional/admin accounts at `/login` using the displayed presets and public passcode `home-access`. This simulates sign-in; it is not authentication.

Built with Next.js App Router, React, TypeScript and Tailwind CSS.

The latest client showcase includes free-phone participation, category question inboxes, first-response moderation and local sample-photo previews. Start at `/demo/walkthrough`; all workflow changes remain in the current tab and reset on refresh. See [current showcase handoff](docs/client-update-showcase-handoff.md) and [remaining scope](docs/remaining-scope-report.md).

For a plain-language progress summary based on the original requirements and later client changes, read [completed work](updates/completed-work.md) and [remaining work and requirements](updates/remaining-work.md).

## Run locally

Requires Node.js 22+ and npm.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). No credentials or environment file are required.

For an optimized local preview, run `npm run build:demo`, then `npm run preview`.

## Demo scope

All businesses and inquiries are fictional. Application, member and admin changes stay in the current tab's React session and reset on refresh. Nothing is delivered or saved permanently; there are no real authentication, database, payment or email integrations. Production deployment remains blocked.

## Checks and documentation

Run `npm run check` for typecheck, lint, unit tests and a demo build. For browser tests, install Chromium with `npx playwright install chromium`, then run `npm run test:e2e`.

Member and admin workspaces use focused, linkable sections. Unsaved drafts remain in React memory during client-side navigation. Sign-out clears identity and drafts, with a discard warning, while keeping submitted fictional records for the walkthrough. Confirmed reset or refresh clears the session.

See the [latest homepage/About Us handoff](docs/phase-2h1-handoff.md), [review walkthrough](docs/phase-2g2-handoff.md), [demo account walkthrough](docs/phase-2f3-handoff.md), [build checklist](docs/build-checklist.md) and [architecture](docs/architecture.md).
