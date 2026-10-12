# Vercel demo preview — 2026-10-12

## Initial publication

Published source commit `c088fe7` as a Vercel Preview deployment using a clean Git archive outside the repository, excluding private sources, environment files, documentation, tests and generated artifacts.

- Public demo URL: https://restored-healthy-homes-client.vercel.app
- Deployment: `dpl_Byr2ejCHSocNRLYceaULWh7HEh19` (READY, Preview).
- Project: `restored-healthy-homes-client`, existing user Vercel team.
- Framework: Next.js; install: `npm ci`; build: `npm run build:demo`; build/runtime `RHH_APP_MODE=demo`.
- Public demo access enabled. No real service integrations or application changes. Existing no-index headers and production guard retained; Vercel first-deployment promotion attempts were rejected by the guard.

Verification: hosted build and TypeScript checks passed. Homepage, directory, education, pricing, login, resources and admin gate returned HTTP 200 without Vercel sign-in and with `X-Robots-Tag: noindex, nofollow`. Actual homepage render inspected in the in-app browser. Existing repository tests were not rerun because application code was unchanged. Remote npm install reported seven high-severity audit findings; dependency remediation was not performed in this deployment task.

Git import issue: user-created project originally linked `ArnavNah/restored-healthy-homes-client`, while committed source is in `arnav-tek/Restored-Healthy-Homes-Client-` on `main`. Reconnection to the original repository failed for lack of Vercel Git-provider access. The successful deployment was a manual source upload, not a Git deployment. Automatic deployments remain unconfigured; grant Vercel access to the original repository before connecting it. Production Git builds remain intentionally blocked.

For future updates, deploy in Preview with the demo environment and move the public alias to the new READY preview; do not promote it to Production or remove the guard.

## Rounded section labels release — 2026-10-12

Source commit `f146b22` was pushed to GitHub and deployed as `dpl_HeippdXquNyd5qN2uwiQUEs2bgwU` (READY, Preview). The existing public alias now points to this deployment. Shared pills replace 39 section labels; 16 decorative label lines are removed. Upload exclusions now explicitly cover local session/config files, secrets and generated artifacts in addition to the existing private-source exclusions.

Typecheck, lint, 89 unit tests and demo build passed. The six affected browser specs passed 67 cases with five intentional viewport skips. Visual inspection covered desktop/tablet/mobile and 320px; layout checks covered 44 combinations across 18 routes with no tag lines or horizontal overflow. The default build rejected missing demo opt-in. All 18 hosted routes returned HTTP 200 with the new tags and no decorative tag lines; no-index headers remain. The public homepage was inspected and refreshed in the browser. Screenshots/logs remain local under `output/`.

Application behavior, session boundaries and production guard are unchanged. This release still uses manual CLI deployment; Git-provider access remains unresolved. This deployment note is committed and pushed separately from the source release; no second application build is required for documentation-only changes excluded from the upload.
