# Installed skills

Installed with OpenAI Skill Installer: `install-skill-from-github.py --repo ... --ref <SHA> --path ... --dest .agents/skills`. Existing project/global locations were checked first; no matching development skills existed. Official GitHub trees were verified. All nine requested paths existed and installed successfully. Full directories, references, scripts, assets and bundled licenses were retained.

| Skill | Official path | Revision | Use |
| --- | --- | --- | --- |
| `security-best-practices` | [openai/skills/skills/.curated/security-best-practices](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-best-practices) | `49f948faa9258a0c61caceaf225e179651397431` | Applied: server/client boundaries, safe JSX, query validation and config gates. |
| `security-threat-model` | [openai/skills/skills/.curated/security-threat-model](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/security-threat-model) | `49f948faa9258a0c61caceaf225e179651397431` | Applied after implementation; repository report in docs/Restored-Healthy-Homes-threat-model.md. |
| `playwright` | [openai/skills/skills/.curated/playwright](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/playwright) | `49f948faa9258a0c61caceaf225e179651397431` | Applied through maintainable @playwright/test files explicitly requested by the user. |
| `react-best-practices` | [vercel-labs/agent-skills/skills/react-best-practices](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/react-best-practices) | `063bee94c3f4df8453406c830b0a7df0f2860278` | Applied: Server Components, parallel reads and minimal serialization. |
| `composition-patterns` | [vercel-labs/agent-skills/skills/composition-patterns](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/composition-patterns) | `063bee94c3f4df8453406c830b0a7df0f2860278` | Applied: children-based dashboard shell and explicit components. |
| `web-design-guidelines` | [vercel-labs/agent-skills/skills/web-design-guidelines](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/web-design-guidelines) | `063bee94c3f4df8453406c830b0a7df0f2860278` | Applied: accessibility, focus, URL state and responsive review. |
| `frontend-design` | [anthropics/skills/skills/frontend-design](https://github.com/anthropics/skills/tree/8a1541c4a3ffa5a20a5a91de0dcf3f0bab1d1ef4/skills/frontend-design) | `8a1541c4a3ffa5a20a5a91de0dcf3f0bab1d1ef4` | Applied: documented plan, client palette, typography and restrained cards. |
| `supabase` | [supabase/agent-skills/skills/supabase](https://github.com/supabase/agent-skills/tree/544bfc56c89afe2b87b20017a59b2c6e9502a1fb/skills/supabase) | `544bfc56c89afe2b87b20017a59b2c6e9502a1fb` | Applied to future contract/security boundaries only; no SDK or services. |
| `supabase-postgres-best-practices` | [supabase/agent-skills/skills/supabase-postgres-best-practices](https://github.com/supabase/agent-skills/tree/544bfc56c89afe2b87b20017a59b2c6e9502a1fb/skills/supabase-postgres-best-practices) | `544bfc56c89afe2b87b20017a59b2c6e9502a1fb` | Applied to stable identity and future relationship/RLS notes only; no SQL/database testing. |

Machine-readable provenance: `.agents/skill-sources.json`. Local installation avoids global duplicates. Skills became discoverable during the session; SKILL.md files were read directly before use.

## Licenses

OpenAI licenses and Anthropic frontend LICENSE.txt remain in the skill directories. Anthropic root THIRD_PARTY_NOTICES.md and Supabase root LICENSE were additionally retained under `.agents/licenses/`. Vercel skills declare MIT in metadata; no root LICENSE/NOTICE was present at the inspected revision, so none was invented.

## Guidance and limits

The Framer skill setup precondition ran and refreshed its global instructions; no Framer project/session was opened or edited because this is a local Next.js implementation. Original Word text was extracted via OOXML without editing/re-exporting it; no Word rendering claim is made.

Sources: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Vercel interface guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api). Supabase documentation was fetched directly when web-tool markdown fetching failed. Recheck service docs/changelog at integration.

The frontend skill's hypothetical client history does not describe this client. Client requirements take precedence. Security context was already provided; no redundant approval gate was introduced.

## Stripe later

Phase 2A reused the installed frontend-design, react-best-practices and playwright guidance directly. No skills or dependencies were reinstalled. Existing security boundaries were preserved; no new Supabase or payment integration was introduced.

[Stripe official skills](https://docs.stripe.com/skills) are recorded for the payments milestone. No payment tools or account connections were installed/provisioned.

Phase 2B reused the existing frontend-design, react-best-practices and playwright skills for server-rendered profiles, a small inquiry client island and browser journey tests. No skill/dependency installs or integrations were needed; existing typography and theme were retained.

Phase 2C-1 reused frontend-design, react-best-practices and playwright, and read composition-patterns plus its state-lift-state rule for the shared context provider. No dependencies or skills were installed. User-authorized tab-local React state supersedes the earlier read-only member shell; it adds no storage or authorization.

Phase 2C-2 reused the installed frontend-design, react-best-practices, composition-patterns and playwright guidance. The existing provider remains the shared source for demo application/member/admin views; browser test files extend the user-requested regression suite. No skills or dependencies were installed.
