// Controlled UI data only; no Auth, Supabase, billing or email transport.
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
const require = createRequire(import.meta.url),
  { build } = require("esbuild"),
  dir = "output/category-regressions";
await mkdir(dir, { recursive: true });
const alias = { "next/link": "./tests/fixtures/consultation-link.tsx" };
await build({
  entryPoints: ["tests/fixtures/category-management.tsx"],
  bundle: true,
  outfile: `${dir}/bundle.js`,
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
  alias,
});
await build({
  entryPoints: ["tests/fixtures/category-ssr.tsx"],
  bundle: true,
  outfile: `${dir}/ssr.cjs`,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  packages: "external",
  loader: { ".css": "empty" },
  alias,
});
const { renderEditor, renderPrices } = require(`../${dir}/ssr.cjs`);
const base = () => ({
  version: 1,
  items: [
    {
      id: "test-category",
      name: "Synthetic category",
      description: "Synthetic category UI configuration only.",
      monthlyUsd: 123,
      billingKey: "membership-test-category",
      active: true,
    },
  ],
  history: [],
});
let state = base();
createServer(async (req, res) => {
  const json = (data, status = 200) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(data));
  };
  if (req.url === "/reset") {
    state = base();
    return json({ reset: true });
  }
  if (req.url.startsWith("/api/admin/categories")) {
    if (req.method === "GET") return json(state);
    if (!req.headers["content-type"]?.startsWith("application/json"))
      return json({ error: "Use JSON; native saving is unavailable." }, 415);
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const input = JSON.parse(raw);
    if (input.version !== state.version)
      return json(
        {
          error: "The saved category catalog changed. Your draft is retained.",
        },
        409,
      );
    if (input.action === "rename")
      state.items = state.items.map((c) =>
        c.id === input.id ? { ...c, name: input.name } : c,
      );
    else
      state.items.push({
        id: input.id,
        name: input.name,
        description: input.description,
        monthlyUsd: input.monthlyUsd,
        billingKey: input.billingKey,
        active: true,
      });
    state.version++;
    return json({ ...state, saved: true });
  }
  if (req.url === "/bundle.js" || req.url === "/bundle.css") {
    res.setHeader(
      "content-type",
      req.url.endsWith("css") ? "text/css" : "text/javascript",
    );
    res.end(await readFile(dir + req.url));
    return;
  }
  const pricing = req.url.startsWith("/pricing");
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(
    `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bundle.css"><title>Controlled category fixture</title><style>*,*::before,*::after{box-sizing:border-box}body{margin:0;padding:20px;background:#f4f1ea;color:#263e29;font:16px Arial}.panel{padding:20px;background:#fff;border:1px solid #dcded2;margin-block:20px}.member-form-fields{display:grid;gap:12px;border:0;padding:0}.search-field{display:grid;gap:8px}button{min-height:44px;margin-block:10px}input,textarea{padding:10px;font:inherit}h1,h2,h3{font-family:Georgia}.field-error{color:#8d3422}p{line-height:1.5}.pricing-category-cell{max-width:280px}td,th{padding:10px;text-align:left}</style></head><body><h1>Controlled category acceptance</h1><p>Actual components; synthetic data, no live Auth/database.</p><main id="root">${pricing ? renderPrices(state) : renderEditor(state)}</main><script id="fixture-data" type="application/json">${JSON.stringify(state).replaceAll("<", "\\u003c")}</script>${pricing ? "" : '<script src="/bundle.js"></script>'}</body></html>`,
  );
}).listen(3244, "127.0.0.1");
