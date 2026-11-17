# Connected Vercel staging preview — 17 November 2026

Published committed source `f3fb577d5fe5d20d04a9281b175a852e8661ebe7` to the existing Vercel client-preview alias:

https://restored-healthy-homes-client.vercel.app/

Deployment `dpl_9KJ7cmTtZq9bQpDtY6VXYFZa9n3P`, unique URL `https://restored-healthy-homes-client-a4l79cnny.vercel.app`. Vercel reports READY, matching sourceCommit and applicationMode=staging. The earlier demo deployment remains available by its unique URL; the shared alias now uses connected staging.

## Configuration

Used the existing project and preview target; production guard/noindex remain. Deployed an archive of committed source outside the Git checkout, excluding local environment files and confidential sources. Archive-only vercel.json overrides the project's demo build command with `npm run build` so the selected staging mode is respected. Runtime/build environment includes the verified staging URL/publishable key, RHH_APP_MODE=staging, the canonical HTTPS alias as RHH_AUTH_ORIGIN, a generated server-only cookie-signing secret and disabled inquiry-email provider. No credential values are recorded here. These are deployment-specific settings; future deployments must preserve staging mode, build command and canonical origin rather than using the older demo publishing command. A new cookie-signing secret invalidates outstanding application recovery grants; keep a stable secret when configuring a repeatable deployment workflow.

After explicit user approval, added only `/auth/callback` and `/auth/recovery` at the canonical HTTPS alias to Supabase's redirect allowlist. Preserved both local callbacks. Default Site URL remains localhost; current application signup/recovery explicitly supply their exact hosted redirect. Email confirmation, SMTP, existing users and roles were unchanged. The healthy staging database has 27 applied migrations; none were replayed or modified.

## Actual verification

- Connected hosted build succeeded; API deployment metadata matches committed code and staging mode.
- Homepage/login/signup/directory/pricing return 200. Auth session endpoint returns an honest signed-out state.
- Private member application/inquiry and admin application/report endpoints return 401 with private/no-store for anonymous requests.
- Actual browser login renders at 1440/768/320px without horizontal overflow; screenshots in output/playwright/connected-vercel-login-*.png, with the 320px render visually inspected.
- Signed-out `/member` and `/admin` visits require login. Invalid login fields return 400; a foreign-origin login request returns 403. These checks do not attempt credentials or send email.
- Supabase UI confirms four allowlisted URLs including the two approved hosted endpoints.

## Client walkthrough and limits

Open the canonical `/login`, use an existing confirmed account, and inspect `/member`, `/member/profile` and the saved application/profile workflow. A database-authorized website admin lands in `/admin`; a new signup remains an ordinary member, not an administrator. Reload saved pages to check persistence, then sign out before another person's session. Do not share passwords in chat.

This deployment enables the existing real account and saved-record implementation. No positive password-login or authenticated save was performed during deployment because no designated test credentials were supplied; full separate-user/admin acceptance remains outstanding as documented in the backend handoff. Default Supabase email still has team/testing delivery limits; signup verification/recovery mailbox receipt is not verified here. Real application email, payments and scheduler remain disabled. Storage and external location credentials were not available and were not uploaded, so media upload/evidence byte operations and provider city/ZIP lookup remain configuration-dependent. Existing empty public results reflect actual saved eligible records, not fictional demo listings. No users, roles, memberships or listings were created or promoted to make the showcase look populated.
