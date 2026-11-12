// An explicit operator/scheduler invocation. Does not choose or configure a provider.
try {
  process.loadEnvFile(".env.local");
} catch {
  /* Secure scheduler environment may supply configuration. */
}
const origin = process.env.RHH_AUTH_ORIGIN;
const secret = process.env.RHH_INQUIRY_WORKER_SECRET;
if (
  process.env.RHH_APP_MODE !== "staging" ||
  !origin ||
  new URL(origin).origin !== origin ||
  !(
    origin.startsWith("https://") ||
    ["http://127.0.0.1:3230", "http://localhost:3230"].includes(origin)
  ) ||
  !secret ||
  !/^[A-Za-z0-9_-]{32,128}$/.test(secret)
)
  throw new Error(
    "Configure the approved staging origin and server-only worker credential.",
  );
const response = await fetch(`${origin}/api/internal/inquiry-notifications`, {
  method: "POST",
  redirect: "error",
  headers: { authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(55_000),
});
if (!response.ok) {
  console.log(
    `Dispatcher did not run successfully (HTTP ${response.status}); no delivery is claimed.`,
  );
  process.exitCode = 1;
} else {
  const result = await response.json();
  console.log({ completed: result.completed === true, counts: result.counts });
}
