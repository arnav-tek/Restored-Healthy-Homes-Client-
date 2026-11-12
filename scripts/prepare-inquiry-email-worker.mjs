// Prepares an operator-only verifier, never a raw credential or automatic change.
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
try {
  process.loadEnvFile(".env.local");
} catch {
  /* Caller may supply a secure environment. */
}
const secret = process.env.RHH_INQUIRY_WORKER_SECRET;
if (!secret || !/^[A-Za-z0-9_-]{32,128}$/.test(secret))
  throw new Error(
    "Configure a random server-only RHH_INQUIRY_WORKER_SECRET locally first.",
  );
if (
  process.env.RHH_APP_MODE !== "staging" ||
  process.env.NEXT_PUBLIC_SUPABASE_URL !==
    "https://xjecnuebalmmblowmtks.supabase.co"
)
  throw new Error("Use only the approved staging configuration.");
const digest = createHash("sha256").update(secret).digest("hex");
await mkdir("output/private", { recursive: true });
await writeFile(
  "output/private/inquiry-email-worker.sql",
  `-- Operator-reviewed staging worker capability. No raw secret is stored here.\nbegin;\ninsert into rhh_private.inquiry_email_worker_keys(token_hash,enabled,allow_test) values('${digest}',true,false) on conflict(token_hash) do update set enabled=true,allow_test=false;\ncommit;\n`,
  { encoding: "utf8", mode: 0o600 },
);
console.log(
  "Prepared output/private/inquiry-email-worker.sql. No credential was printed or applied. Delivery remains disabled.",
);
