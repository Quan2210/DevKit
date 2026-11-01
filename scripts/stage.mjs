// Merge the prerender output into one deployable folder (`stage/`).
// With a base path, React Router writes HTML to build/client/<base>/ but assets to build/client/.
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { getBase } from "../config/env.mjs";

const src = "build/client";
const out = "stage";
const baseDir = getBase().replace(/^\/|\/$/g, "");

rmSync(out, { recursive: true, force: true });
for (const name of readdirSync(src)) {
  // With a base path the top-level index.html is only the SPA fallback; the real Home is under <base>/.
  if (baseDir && (name === baseDir || name === "index.html")) continue;
  cpSync(join(src, name), join(out, name), { recursive: true });
}
if (baseDir) cpSync(join(src, baseDir), out, { recursive: true });

const notFound = join(out, "404", "index.html");
if (!existsSync(notFound))
  throw new Error("Prerendered /404 not found; check react-router.config.ts prerender");
cpSync(notFound, join(out, "404.html"));
console.log(`staged -> ${out}/ (base: ${baseDir ? `/${baseDir}/` : "/"})`);
