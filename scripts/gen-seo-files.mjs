// Write sitemap.xml and robots.txt into stage/ from the tool registry (docs/04 Change 1.14).
// Node runs the .ts imports directly (type stripping), so these modules must stay erasable-syntax only.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { getBase, getSiteUrl } from "../config/env.mjs";
import { joinUrl } from "../src/lib/url-core.ts";
import { buildRobotsTxt, buildSitemapXml } from "../src/lib/sitemap.ts";
import { listedTools, toolPath } from "../src/registry/tools.meta.ts";

const out = process.argv[2] ?? "stage";
const origin = getSiteUrl();
const base = getBase();

const paths = ["/", ...listedTools().map(toolPath)];
const urls = paths.map((path) => joinUrl(origin, base, path));
writeFileSync(join(out, "sitemap.xml"), buildSitemapXml(urls));
writeFileSync(join(out, "robots.txt"), buildRobotsTxt(`${joinUrl(origin, base, "")}sitemap.xml`));
console.log(`SEO files: sitemap.xml (${urls.length} urls) and robots.txt for ${origin}${base}`);
