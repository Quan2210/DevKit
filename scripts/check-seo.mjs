// CLI: validate the staged build. Fails the process on any problem.
import { getBase, getSiteUrl } from "../config/env.mjs";
import { joinUrl } from "../src/lib/url-core.ts";
import { listedTools, routableTools, toolPath } from "../src/registry/tools.meta.ts";
import { checkSeo } from "./lib/seo-check.mjs";

const root = process.argv[2] ?? "stage";
const origin = getSiteUrl();
const base = getBase();

const pages = [
  { path: "/", file: "index.html" },
  ...routableTools().map((tool) => ({
    path: toolPath(tool),
    file: `${toolPath(tool).slice(1)}/index.html`,
  })),
  { path: "/404", file: "404.html" },
];
const errors = checkSeo(root, {
  pages,
  expectedUrl: (path) => joinUrl(origin, base, path),
  sitemapPaths: ["/", ...listedTools().map(toolPath)],
});

if (errors.length > 0) {
  console.error(
    `check:seo failed (${errors.length}):\n${errors.map((e) => `  - ${e}`).join("\n")}`,
  );
  process.exit(1);
}
console.log(`check:seo ok: ${pages.length} pages for ${origin}${base}`);
