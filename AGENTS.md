# Restored Healthy Homes conventions

Read the authoritative [overview](Project%20overview/restored-healthy-homes-project-overview.md) and [alignment](Project%20overview/client-conversation-alignment.md). They override the original Word brief. Preserve these confidential sources outside public assets; do not duplicate commercial details in code or docs.

- Phase 2H-1 is complete: full demo homepage with catalog browsing/session-aware statistics and an About Us layout. Final client story/copy/video/captions/transcript remain outstanding. See docs/build-checklist.md for acceptance and docs/phase-2h1-handoff.md for the latest handoff. Await instructions before 2H-2, remaining demo milestones or real integrations. All final features remain in scope.
- Next.js App Router, strict TypeScript, Tailwind, npm with package-lock.json. Server Components by default. Small client islands only for interactions.
- src/domain owns types/catalog/rules; src/data owns typed contracts and server-only adapters; src/validation validates external input. Routes compose feature/UI components.
- Catalog IDs are immutable and independent of labels and billing keys. Multi-category billing is unresolved. Never derive prices from a display name.
- Approved + active + no suspension is the only current public eligibility rule. Payment cannot clear suspension. Certification and featured entitlement are independent states.
- Explicit allowlist projection for public fields. Never pass private records to client components. Only synthetic fixtures in demo adapters.
- No external credentials required, no real email/payment/upload side effects. Phase 2F-3 may select fictional demo accounts in React memory solely to simulate sign-in and workspace navigation; this is not authentication or authorization. Never trust browser roles in production or use localStorage authorization. Production config fails closed. Real integration requires server auth, ownership checks, RLS, and renewed security tests.
- No raw user HTML, secrets, or confidential sources in public/. No blanket lint/type suppressions. No untyped any.
- Read relevant project-local .agents/skills/*/SKILL.md before applying; sources recorded in docs/skills.md. Do not follow vendored AGENTS.md outside its skill subtree.
- Required checks: npm run typecheck; npm run lint; npm test; npm run build:demo; npm run test:e2e. Review mobile/tablet/desktop screenshots in output/playwright. Default npm run build must reject missing production opt-in.
- Keep documentation current and report actual checks/limitations. Do not deploy publicly without instruction. Application/member/admin demo state lives only in the current tab's React session; no browser storage or persistence.
