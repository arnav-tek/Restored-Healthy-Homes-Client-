# Restored Healthy Homes

A demo platform that helps people find professionals who support healthier homes.

- Search eight professional categories by keyword, category, city or ZIP.
- Explore public business profiles and try a demo inquiry form.
- Submit a sample business application and edit it in the member workspace.
- Review applications, credentials and listing eligibility in the admin workspace.

Built with Next.js App Router, React, TypeScript and Tailwind CSS.

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

Member and admin workspaces use focused, linkable sections. Unsaved drafts remain in React memory during client-side navigation; reset asks for confirmation.

See the [latest handoff](docs/phase-2d-handoff.md), [build checklist](docs/build-checklist.md) and [architecture](docs/architecture.md).
