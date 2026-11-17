// Actual components; synthetic records and intercepted APIs are not live Auth acceptance.
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
const require = createRequire(import.meta.url),
  { build } = require("esbuild");
const dir = "output/consultation-regressions";
await mkdir(dir, { recursive: true });
// Negative control: remove just the two corrections to prove the regressions
// detect the original readiness/state bugs. Never used by application builds.
const plugins =
  process.env.RHH_CONSULTATION_TEST_BASELINE === "1"
    ? [
        {
          name: "pre-fix-negative-control",
          setup(build) {
            build.onLoad(
              { filter: /connected-(request|workspace)\.tsx$/ },
              async (args) => {
                let contents = await readFile(args.path, "utf8");
                if (args.path.endsWith("connected-request.tsx"))
                  contents = contents.replaceAll("!ready || ", "");
                else
                  contents = contents
                    .replace(
                      /  if \(snapshot.source !== initial\)\s+setSnapshot\(\{ source: initial, data: initial, error: (?:""|initialError) \}\);/,
                      "",
                    )
                    .replace(
                      "const data = snapshot.source === initial ? snapshot.data : initial;",
                      "const data = snapshot.data;",
                    );
                return { contents, loader: "tsx" };
              },
            );
          },
        },
      ]
    : [];
await build({
  entryPoints: ["tests/fixtures/consultation-workspaces.tsx"],
  bundle: true,
  outfile: `${dir}/bundle.js`,
  jsx: "automatic",
  alias: { "next/link": "./tests/fixtures/consultation-link.tsx" },
  define: { "process.env.NODE_ENV": '"development"' },
  plugins,
});
await build({
  entryPoints: ["tests/fixtures/consultation-ssr.tsx"],
  bundle: true,
  outfile: `${dir}/ssr.cjs`,
  jsx: "automatic",
  platform: "node",
  format: "cjs",
  packages: "external",
  loader: { ".css": "empty" },
  plugins,
  define: { "process.env.NODE_ENV": '"development"' },
});
const { form } = require(`../${dir}/ssr.cjs`);
createServer(async (req, res) => {
  if (req.url.startsWith("/api/")) {
    res.writeHead(415, { "Content-Type": "application/json" });
    res.end('{"error":"Use JSON; native submission is unavailable."}');
    return;
  }
  if (req.url === "/bundle.js" || req.url === "/bundle.css") {
    res.setHeader(
      "Content-Type",
      req.url.endsWith("css") ? "text/css" : "text/javascript",
    );
    res.end(await readFile(`${dir}${req.url}`));
    return;
  }
  res.setHeader("Content-Type", "text/html");
  res.end(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/bundle.css"><style>*,*::before,*::after{box-sizing:border-box}body{margin:0;padding:20px;background:#f4f1ea;color:#263e29;font:16px Arial}.panel,.consultation-record-card{padding:20px;background:#fff;border:1px solid #dcded2;margin-bottom:20px}h2{font-family:Georgia}nav{display:flex;gap:20px}</style></head><body><main id="root">${req.url.startsWith("/workspace") || req.url.startsWith("/participation") ? "" : form()}</main><script src="/bundle.js"></script></body></html>`,
  );
}).listen(3242, "127.0.0.1");
