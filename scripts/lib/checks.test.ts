import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkBundle } from "./bundle-check.mjs";
import { checkSeo } from "./seo-check.mjs";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "devkit-check-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const CSP = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'">';
const page = (overrides: { canonical?: string; h1?: number; title?: string } = {}) => {
  const url = overrides.canonical ?? "https://x.dev/DevKit/";
  return `<!DOCTYPE html><html lang="vi"><head>${CSP}<title>${overrides.title ?? "DevKit"}</title>
<meta name="description" content="d"/><meta property="og:title" content="t"/>
<meta property="og:description" content="d"/><meta property="og:url" content="${url}"/>
<meta name="twitter:card" content="summary"/><link rel="canonical" href="${url}"/></head>
<body>${"<h1>x</h1>".repeat(overrides.h1 ?? 1)}</body></html>`;
};
const expectedUrl = (path: string) => `https://x.dev/DevKit${path === "/" ? "/" : `${path}/`}`;

function writeSite(html: string) {
  writeFileSync(join(root, "index.html"), html);
  writeFileSync(
    join(root, "sitemap.xml"),
    "<urlset><url><loc>https://x.dev/DevKit/</loc></url></urlset>",
  );
  writeFileSync(join(root, "robots.txt"), "Sitemap: https://x.dev/DevKit/sitemap.xml\n");
  writeFileSync(join(root, "_headers"), "/*\n");
}
const options = { pages: [{ path: "/", file: "index.html" }], expectedUrl, sitemapPaths: ["/"] };

describe("checkSeo", () => {
  it("passes a complete page", () => {
    writeSite(page());
    expect(checkSeo(root, options)).toEqual([]);
  });

  it("flags a wrong canonical (F-2), a missing h1 and two h1s", () => {
    writeSite(page({ canonical: "https://x.dev/DevKit//DevKit/" }));
    expect(checkSeo(root, options).join("\n")).toMatch(/canonical .* != expected/);
    writeSite(page({ h1: 0 }));
    expect(checkSeo(root, options).join("\n")).toMatch(/exactly 1 <h1>, found 0/);
    writeSite(page({ h1: 2 }));
    expect(checkSeo(root, options).join("\n")).toMatch(/found 2/);
  });

  it("flags a missing page, sitemap entry and CSP meta not first in head", () => {
    writeSite(page().replace(CSP, "").replace("<head>", `<head><meta charset="utf-8">`));
    const errors = checkSeo(root, {
      ...options,
      pages: [...options.pages, { path: "/tools/a", file: "tools/a/index.html" }],
      sitemapPaths: ["/", "/tools/a"],
    });
    expect(errors.join("\n")).toMatch(/tools\/a\/index.html: missing/);
    expect(errors.join("\n")).toMatch(/sitemap.xml: missing https:\/\/x.dev\/DevKit\/tools\/a\//);
    expect(errors.join("\n")).toMatch(/CSP <meta> must be the first element/);
  });
});

describe("checkBundle", () => {
  function writeBundle(homeJs: string, otherJs = "") {
    mkdirSync(join(root, "assets"), { recursive: true });
    writeFileSync(
      join(root, "index.html"),
      '<script type="module" src="/DevKit/assets/home.js"></script>',
    );
    writeFileSync(join(root, "assets", "home.js"), homeJs);
    if (otherJs) writeFileSync(join(root, "assets", "editor.js"), otherJs);
  }

  it("passes a clean bundle", () => {
    writeBundle("console.log('home')", "const x='cm-editor'");
    expect(checkBundle(root)).toEqual([]);
  });

  it("fails when Home loads a heavy library chunk (SD-11)", () => {
    writeBundle("const c='cm-editor'");
    expect(checkBundle(root).join("\n")).toMatch(
      /index.html loads assets\/home.js which contains "cm-editor"/,
    );
  });

  it("fails when a worker chunk touches the DOM, which a Web Worker does not have", () => {
    writeBundle("ok");
    writeFileSync(
      join(root, "assets", "markdown.worker-abc.js"),
      "const e=document.createElement('i')",
    );
    expect(checkBundle(root).join("\n")).toMatch(/worker chunk calls document.createElement/);
  });

  it("allows DOM use in ordinary chunks", () => {
    writeBundle("ok", "const e=document.createElement('i')");
    expect(checkBundle(root)).toEqual([]);
  });

  it("fails on fonts inlined as data: URIs that the CSP would block", () => {
    writeBundle("ok");
    writeFileSync(
      join(root, "assets", "root.css"),
      "@font-face{src:url(data:font/woff2;base64,AAAA) format('woff2')}",
    );
    expect(checkBundle(root).join("\n")).toMatch(/data: font that the CSP would block/);
  });

  it("fails on eval, new Function and secrets (SD-13)", () => {
    writeBundle("ok", "eval('1'); new Function('return 1'); const k='AKIAABCDEFGHIJKLMNOP'");
    const errors = checkBundle(root).join("\n");
    expect(errors).toMatch(/contains eval\(/);
    expect(errors).toMatch(/contains new Function\(/);
    expect(errors).toMatch(/AWS access key/);
  });
});
