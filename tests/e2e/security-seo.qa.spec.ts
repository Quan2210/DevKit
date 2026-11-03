import { expect, test } from "@playwright/test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { routableTools, toolPath } from "../../src/registry/tools.meta";

const ROOT = join(process.cwd(), "stage");
const paths = ["", ...routableTools().map((tool) => toolPath(tool).slice(1) + "/")];

function parseCsp(csp: string) {
  const map = new Map<string, string[]>();
  for (const part of csp.split(";")) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) map.set(name, values);
  }
  return map;
}

test.describe("security on the built output", () => {
  test("the CSP meta and the _headers CSP agree (meta cannot carry frame-ancestors)", async ({
    request,
  }) => {
    const headersFile = readFileSync(join(ROOT, "_headers"), "utf8");
    const headerCsp = headersFile.match(/Content-Security-Policy:\s*(.+)/)![1]!;
    const header = parseCsp(headerCsp);
    for (const path of paths) {
      const response = await request.get(path);
      const html = await response.text();
      const meta = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/)?.[1];
      expect(meta, `CSP meta on ${path}`).toBeTruthy();
      const m = parseCsp(meta!);
      // Same served header as _headers (serve.mjs applies it).
      expect(response.headers()["content-security-policy"]).toBe(headerCsp);
      for (const [k, v] of header) {
        if (k === "frame-ancestors") continue;
        expect(m.get(k), `${path} ${k}`).toEqual(v);
      }
      // No unsafe-inline / unsafe-eval in script-src, and no wildcard.
      const script = m.get("script-src")!;
      expect(script).not.toContain("'unsafe-inline'");
      expect(script).not.toContain("'unsafe-eval'");
      expect(script.join(" ")).not.toMatch(/\*|https?:/);
      expect(m.get("connect-src")).toEqual(["'self'"]);
      expect(m.get("object-src")).toEqual(["'none'"]);
      expect(header.get("frame-ancestors")).toEqual(["'none'"]);
    }
    expect(headersFile).toMatch(/X-Content-Type-Options:\s*nosniff/);
    expect(headersFile).toMatch(/Referrer-Policy:/);
  });

  test("the bundle contains no eval or Function constructor calls", async () => {
    const dir = join(ROOT, "assets");
    const hits: string[] = [];
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".js"))) {
      const src = readFileSync(join(dir, file), "utf8");
      if (/(^|[^.\w$])eval\s*\(/.test(src)) hits.push(`${file}: eval(`);
      if (/new Function\s*\(/.test(src)) hits.push(`${file}: new Function(`);
    }

    console.log("EVAL/FUNCTION HITS", JSON.stringify(hits));
    expect(hits).toEqual([]);
  });

  test("inline script, inline handler and eval are actually blocked by the CSP", async ({
    page,
  }) => {
    const violations: string[] = [];
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (e) => {
        (window as unknown as { __v: string[] }).__v ??= [];
        (window as unknown as { __v: string[] }).__v.push(e.violatedDirective);
      });
    });
    // Same-origin script (allowed by 'self'): the only way to test eval under the CSP without the CDP bypass.
    await page.route("**/theme-init.js", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: `window.__probe = {};
          try { (0, eval)("1"); window.__probe.eval = "ran"; } catch (e) { window.__probe.eval = e.name; }
          try { new Function("return 1")(); window.__probe.fn = "ran"; } catch (e) { window.__probe.fn = e.name; }
          try { setTimeout("window.__probe.str = 'ran'", 0); } catch (e) { window.__probe.str = e.name; }`,
      }),
    );
    await page.goto("tools/json-formatter/");
    await page.waitForLoadState("networkidle");
    const probe = await page.evaluate(
      () => (window as unknown as { __probe: Record<string, string> }).__probe,
    );
    expect(probe.eval).toBe("EvalError");
    expect(probe.fn).toBe("EvalError");
    const result = await page.evaluate(async () => {
      const w = window as unknown as { __v?: string[]; __ran?: string[] };
      w.__ran = [];
      const s = document.createElement("script");
      s.textContent = "window.__ran.push('inline-script')";
      document.body.appendChild(s);
      const holder = document.createElement("div");
      holder.innerHTML = '<img src="x" onerror="window.__ran.push(\'handler\')">';
      document.body.appendChild(holder);
      const a = document.createElement("a");
      a.href = "javascript:window.__ran.push('js-url')";
      document.body.appendChild(a);
      a.click();
      // eval/new Function run from CDP-evaluated code bypass the CSP, so they are probed from a real page script below.
      const evalError = "EvalError";
      const fnError = "EvalError";
      let fetchError = "none";
      try {
        await fetch("https://example.org/");
      } catch (e) {
        fetchError = (e as Error).name;
      }
      await new Promise((r) => setTimeout(r, 300));
      return { ran: w.__ran, v: w.__v, evalError, fnError, fetchError };
    });
    violations.push(...(result.v ?? []));
    expect(result.ran).toEqual([]);
    expect(result.evalError).toBe("EvalError");
    expect(result.fnError).toBe("EvalError");
    expect(result.fetchError).toBe("TypeError");
    expect(violations.some((v) => v.startsWith("script-src"))).toBe(true);
    expect(violations).toContain("connect-src");
  });

  test("theme-init is a same-origin file, first script, and ignores a hostile stored value", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("devkit:v1:theme", '"<img src=x onerror=alert(1)>"');
    });
    page.on("dialog", (d) => {
      void d.dismiss();
      throw new Error("dialog opened");
    });
    await page.goto("");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
    const html = readFileSync(join(ROOT, "index.html"), "utf8");
    expect(html).toMatch(/<script src="\/DevKit\/theme-init\.js">/);
  });
});

test.describe("SEO on the built output (fetched without JavaScript)", () => {
  test("every page has unique title/description, canonical, og, twitter, one h1; og:image is a real file URL", async ({
    request,
  }) => {
    const titles = new Set<string>();
    const descs = new Set<string>();
    const all = [...paths, "404/"];
    for (const path of all) {
      const html = await (await request.get(path)).text();
      const get = (re: RegExp) => re.exec(html)?.[1];
      const title = get(/<title>([^<]*)<\/title>/)!;
      const desc = get(/<meta name="description" content="([^"]*)"/)!;
      expect(title, path).toBeTruthy();
      expect(desc, path).toBeTruthy();
      expect(titles.has(title), `dup title ${path}`).toBe(false);
      expect(descs.has(desc), `dup description ${path}`).toBe(false);
      titles.add(title);
      descs.add(desc);
      expect(get(/<meta property="og:title" content="([^"]*)"/)).toBe(title);
      expect(get(/<meta property="og:description" content="([^"]*)"/)).toBe(desc);
      expect(get(/<meta name="twitter:title" content="([^"]*)"/)).toBe(title);
      expect(get(/<meta name="twitter:card" content="([^"]*)"/)).toBe("summary_large_image");
      const canonical = get(/<link rel="canonical" href="([^"]*)"/)!;
      expect(canonical, path).toMatch(/^https:\/\/quan2210\.github\.io\/DevKit\//);
      expect(get(/<meta property="og:url" content="([^"]*)"/)).toBe(canonical);
      expect((html.match(/<h1[\s>]/g) ?? []).length, `h1 ${path}`).toBe(1);
      for (const [attr, name] of [
        ["property", "og:image"],
        ["name", "twitter:image"],
      ]) {
        const img = get(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))!;
        // A static host serves a file only at its exact path: a trailing slash 404s on GitHub Pages.
        expect(img, `${name} on ${path} must not end with a slash`).not.toMatch(/\/$/);
        const rel = img.replace("https://quan2210.github.io/DevKit/", "");
        expect(existsSync(join(ROOT, rel)), `${name} file ${rel}`).toBe(true);
      }
    }
  });

  test("sitemap lists exactly the 11 public URLs, robots points at it, 404 is not indexed", async ({
    request,
  }) => {
    const sitemap = await (await request.get("sitemap.xml")).text();
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toHaveLength(11);
    expect(new Set(locs).size).toBe(11);
    expect(locs.some((l) => l!.includes("404"))).toBe(false);
    const robots = await (await request.get("robots.txt")).text();
    expect(robots).toContain("Sitemap: https://quan2210.github.io/DevKit/sitemap.xml");
    expect(robots).not.toMatch(/Disallow:\s*\/\s*$/m);
  });

  test("unknown URLs return status 404 and a tool URL reloads fine as a deep link", async ({
    page,
    request,
  }) => {
    for (const bad of ["tools/nope/", "nope", "tools/json-formatter/extra", "tools/"]) {
      const r = await request.get(bad);
      expect(r.status(), bad).toBe(404);
      expect(await r.text()).toContain("<h1");
    }
    await page.goto("tools/uuid-generator/");
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("UUID Generator");
    await page.goto("tools/uuid-generator"); // no trailing slash
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("UUID Generator");
  });
});
