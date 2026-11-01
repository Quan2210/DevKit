import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const unescapeHtml = (value) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/** Content of `<meta {attr}="{name}" content="...">`, or undefined. */
function metaContent(html, attr, name) {
  const tag = html.match(new RegExp(`<meta\\s[^>]*${attr}="${name}"[^>]*>`));
  const content = tag?.[0].match(/content="([^"]*)"/);
  return content ? unescapeHtml(content[1]) : undefined;
}

/**
 * Check every prerendered page for SEO basics (SD-2, SD-3).
 * @param {string} root deploy folder (stage/)
 * @param {{ pages: Array<{ path: string, file: string }>, expectedUrl: (path: string) => string, sitemapPaths: string[] }} options
 * @returns {string[]} error messages; empty when everything passes
 */
export function checkSeo(root, { pages, expectedUrl, sitemapPaths }) {
  const errors = [];
  const titles = new Map();

  for (const { path, file } of pages) {
    const full = join(root, file);
    if (!existsSync(full)) {
      errors.push(`${file}: missing (page ${path})`);
      continue;
    }
    const html = readFileSync(full, "utf8");
    const at = (message) => errors.push(`${file}: ${message}`);

    const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim();
    if (!title) at("missing <title>");
    else {
      const other = titles.get(title);
      if (other) at(`duplicate <title> with ${other}`);
      titles.set(title, file);
    }
    if (!metaContent(html, "name", "description")) at("missing meta description");
    for (const property of ["og:title", "og:description", "og:url"]) {
      if (!metaContent(html, "property", property)) at(`missing ${property}`);
    }
    if (!metaContent(html, "name", "twitter:card")) at("missing twitter:card");

    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    const expected = expectedUrl(path);
    if (!canonical) at("missing canonical");
    else if (unescapeHtml(canonical) !== expected)
      at(`canonical ${canonical} != expected ${expected}`);
    const ogUrl = metaContent(html, "property", "og:url");
    if (ogUrl && ogUrl !== expected) at(`og:url ${ogUrl} != expected ${expected}`);

    const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
    if (h1Count !== 1) at(`expected exactly 1 <h1>, found ${h1Count}`);
    if (!/<html[^>]*\slang="vi"/.test(html)) at('missing <html lang="vi">');

    const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? "";
    if (!head.startsWith('<meta http-equiv="Content-Security-Policy"')) {
      at("CSP <meta> must be the first element of <head>");
    }
  }

  const sitemapFile = join(root, "sitemap.xml");
  if (!existsSync(sitemapFile)) errors.push("sitemap.xml: missing");
  else {
    const sitemap = readFileSync(sitemapFile, "utf8");
    for (const path of sitemapPaths) {
      const url = expectedUrl(path);
      if (!sitemap.includes(`<loc>${url}</loc>`)) errors.push(`sitemap.xml: missing ${url}`);
    }
  }
  if (!existsSync(join(root, "robots.txt"))) errors.push("robots.txt: missing");
  else if (!/^Sitemap: /m.test(readFileSync(join(root, "robots.txt"), "utf8"))) {
    errors.push("robots.txt: missing Sitemap line");
  }
  if (!existsSync(join(root, "_headers"))) errors.push("_headers: missing");
  return errors;
}
