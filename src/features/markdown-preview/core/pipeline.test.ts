import { describe, expect, it } from "vitest";
import {
  dataImageMarkdown,
  externalImageCases,
  securityCases,
  syntaxCases,
} from "../../../../tests/fixtures";
import { renderMarkdown } from "./pipeline";

const FORBIDDEN_TAGS =
  "script, iframe, frame, frameset, object, embed, applet, style, svg, math, form, input:not([type=checkbox]), button, link, meta, base, template, textarea, select";
const URL_ATTRIBUTES = [
  "href",
  "src",
  "action",
  "formaction",
  "srcdoc",
  "data",
  "poster",
  "background",
  "xlink:href",
];

/** Structural safety checks on the rendered HTML, independent of any particular payload. */
function assertSafeDom(html: string, label: string, { allowExternalImages = false } = {}) {
  const root = document.createElement("div");
  root.innerHTML = html;

  expect(root.querySelectorAll(FORBIDDEN_TAGS).length, `${label}: forbidden element`).toBe(0);

  for (const element of root.querySelectorAll("*")) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      expect(name.startsWith("on"), `${label}: ${name} on <${element.tagName}>`).toBe(false);
      expect(name, `${label}: style attribute`).not.toBe("style");
      expect(name, `${label}: srcset`).not.toBe("srcset");
      if (URL_ATTRIBUTES.includes(name)) {
        const value = attribute.value.trim();
        expect(value, `${label}: dangerous URL`).not.toMatch(
          /^(javascript|vbscript|data:text|data:application)/i,
        );
        const external = /^(https?:)?\/\//i.test(value);
        if (external && !(element.tagName === "A" && name === "href")) {
          // Only a link may point outside, and only because the user clicks it; an image only with opt-in.
          expect(
            element.tagName === "IMG" && allowExternalImages,
            `${label}: <${element.tagName} ${name}> is external`,
          ).toBe(true);
        }
      }
      if (name === "id" || name === "name") {
        expect(attribute.value, `${label}: unprefixed ${name}`).toMatch(
          /^(user-content-|md-|footnote-label$)/,
        );
      }
    }
  }
}

describe("syntax (CommonMark and GFM)", () => {
  it.each(syntaxCases)("renders: $name", async ({ markdown, contains }) => {
    const { html } = await renderMarkdown(markdown);
    for (const fragment of contains) expect(html, fragment).toContain(fragment);
  });

  it("renders an empty document as empty output", async () => {
    expect(await renderMarkdown("")).toEqual({ html: "", headings: [], droppedHtml: false });
  });
});

describe("security: no active content survives (SD-8, PRD 9.4)", () => {
  it.each(securityCases)("$name", async ({ markdown, mustNotContain }) => {
    for (const allowExternalImages of [false, true]) {
      const { html } = await renderMarkdown(markdown, { allowExternalImages });
      const lower = html.toLowerCase();
      for (const fragment of mustNotContain) {
        expect(lower, `${fragment} (external=${allowExternalImages})`).not.toContain(
          fragment.toLowerCase(),
        );
      }
      assertSafeDom(html, `${markdown} (external=${allowExternalImages})`, { allowExternalImages });
    }
  });

  const vectors = [
    "<script>alert(1)</script>",
    "<SCRIPT SRC=//evil.example/x.js></SCRIPT>",
    "<img src=x onerror=alert(1)>",
    '<img src="x" onerror="alert(1)" />',
    "<svg/onload=alert(1)>",
    "<svg><script>alert(1)</script></svg>",
    '<math><mi xlink:href="javascript:alert(1)">x</mi></math>',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    '<object data="javascript:alert(1)"></object>',
    '<embed src="javascript:alert(1)">',
    '<a href="javascript:alert(1)">x</a>',
    '<a href="  &#14;  javascript:alert(1)">x</a>',
    '<a href="jav&#x09;ascript:alert(1)">x</a>',
    '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>',
    "<body onload=alert(1)>",
    "<input onfocus=alert(1) autofocus>",
    "<form action=javascript:alert(1)><button formaction=javascript:alert(1)>x</button></form>",
    "<details open ontoggle=alert(1)>x</details>",
    "<video><source onerror=alert(1)></video>",
    "<style>@import 'https://evil.example/x.css';</style>",
    "<link rel=stylesheet href=https://evil.example/x.css>",
    '<meta http-equiv=refresh content="0;url=javascript:alert(1)">',
    '<base href="https://evil.example/">',
    '<div style="background:url(https://evil.example/x.png)">x</div>',
    '<img srcset="https://evil.example/a.png 1x">',
    '<picture><source srcset="https://evil.example/a.png"><img src=x></picture>',
    "[x](javascript:alert(1))",
    "[x](JAVASCRIPT:alert(1))",
    "[x](vbscript:msgbox(1))",
    "[x](data:text/html,<script>alert(1)</script>)",
    "[x](file:///etc/passwd)",
    "![x](javascript:alert(1))",
    '![x](x" onerror="alert(1))',
    '[x](https://example.com "title" onmouseover="alert(1)")',
    '<https://example.com/" onmouseover="alert(1)>',
    '```"onmouseover="alert(1)\n<script>alert(1)</script>\n```',
    '```js" onmouseover="alert(1)\ncode\n```',
    "[ref]: javascript:alert(1)\n\n[ref]",
    "# <img src=x onerror=alert(1)>",
    "| a |\n|---|\n| <img src=x onerror=alert(1)> |",
    "- [x] <script>alert(1)</script>",
    "[^1]: <img src=x onerror=alert(1)>\n\ntext[^1]",
    "&lt;script&gt;alert(1)&lt;/script&gt;",
    "<!-- --><script>alert(1)</script>",
    "<![CDATA[<script>alert(1)</script>]]>",
    '<a href="//evil.example/" target="_self" rel="opener">x</a>',
    '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>',
    "\u0000<script>alert(1)</script>",
  ];

  it.each(vectors)("known XSS vector: %j", async (markdown) => {
    for (const allowExternalImages of [false, true]) {
      const { html } = await renderMarkdown(markdown, { allowExternalImages });
      assertSafeDom(html, markdown, { allowExternalImages });
    }
  });

  it("output is stable: rendering the exported HTML as Markdown source adds no active content", async () => {
    const first = await renderMarkdown(securityCases.map((c) => c.markdown).join("\n\n"));
    const second = await renderMarkdown(first.html);
    assertSafeDom(second.html, "re-rendered export");
  });
});

describe("raw HTML", () => {
  it("is dropped and reported, never rendered", async () => {
    const { html, droppedHtml } = await renderMarkdown("<div class=x>hidden</div>\n\nvisible");
    expect(droppedHtml).toBe(true);
    expect(html).toContain("visible");
    expect(html).not.toContain("<div");
  });

  it("is not reported for plain Markdown", async () => {
    expect((await renderMarkdown("# title\n\ntext")).droppedHtml).toBe(false);
  });
});

describe("privacy: images (PRD 3.10, SD-7)", () => {
  it.each(externalImageCases)("blocks by default: $name", async ({ markdown, mustNotContain }) => {
    const { html, droppedHtml } = await renderMarkdown(markdown);
    for (const fragment of mustNotContain) expect(html).not.toContain(fragment);
    expect(html).not.toMatch(/tracker\.example/);
    const root = document.createElement("div");
    root.innerHTML = html;
    expect(root.querySelectorAll("img").length).toBe(0);
    // A Markdown image leaves a visible placeholder; a raw HTML <img> is dropped with the rest of the raw HTML.
    if (droppedHtml) expect(html).not.toContain("md-blocked-image");
    else expect(html).toContain("md-blocked-image");
  });

  it("shows the alt text in the placeholder and leaves no URL in the DOM", async () => {
    const { html } = await renderMarkdown("![A tracking pixel](https://tracker.example/p.png)");
    expect(html).toContain("Ảnh bị chặn: A tracking pixel");
    expect(html).not.toContain("tracker.example");
  });

  it("loads external images only after an explicit opt-in, with no referrer", async () => {
    const { html } = await renderMarkdown("![t](https://img.example/a.png)", {
      allowExternalImages: true,
    });
    const root = document.createElement("div");
    root.innerHTML = html;
    const img = root.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("https://img.example/a.png");
    expect(img.getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  it("upgrades protocol-relative sources and still blocks relative paths and other schemes after opt-in", async () => {
    const protocolRelative = await renderMarkdown("![t](//img.example/a.png)", {
      allowExternalImages: true,
    });
    expect(protocolRelative.html).toContain('src="https://img.example/a.png"');
    for (const source of ["/a.png", "a.png", "../a.png", "ftp://x.example/a.png"]) {
      const { html } = await renderMarkdown(`![t](${source})`, { allowExternalImages: true });
      expect(html, source).toContain("md-blocked-image");
      expect(html, source).not.toContain("<img");
    }
  });

  it("keeps inline raster images, which never leave the browser", async () => {
    const { html } = await renderMarkdown(dataImageMarkdown);
    expect(html).toContain("<img");
    expect(html).toContain("data:image/png;base64,iVBORw0KGgo=");
  });

  it("blocks inline SVG images (scriptable) and non-image data URIs", async () => {
    for (const source of [
      "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
      "data:text/html;base64,PHNjcmlwdD48L3NjcmlwdD4=",
      "data:image/png,notbase64",
    ]) {
      const { html } = await renderMarkdown(`![t](${source})`);
      expect(html, source).not.toContain("<img");
    }
  });
});

describe("links", () => {
  it("external links open in a new tab without opener or referrer access", async () => {
    const { html } = await renderMarkdown("[x](https://example.com)");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("mailto and in-page links are left alone", async () => {
    const mail = await renderMarkdown("[m](mailto:a@example.com)");
    expect(mail.html).toContain('href="mailto:a@example.com"');
    expect(mail.html).not.toContain("target=");
  });

  it("drops a javascript: href but keeps the link text", async () => {
    const { html } = await renderMarkdown("[click me](javascript:alert(1))");
    expect(html).toContain("click me");
    expect(html).not.toContain("javascript:");
  });
});

describe("headings and ids", () => {
  it("gives every heading a prefixed, unique id and reports them for the table of contents", async () => {
    const { html, headings } = await renderMarkdown(
      "# Tổng quan\n\n## Cài đặt\n\n## Cài đặt\n\n### 日本語",
    );
    expect(headings.map((h) => [h.depth, h.text])).toEqual([
      [1, "Tổng quan"],
      [2, "Cài đặt"],
      [2, "Cài đặt"],
      [3, "日本語"],
    ]);
    expect(new Set(headings.map((h) => h.id)).size).toBe(4);
    for (const heading of headings) {
      expect(heading.id.startsWith("md-")).toBe(true);
      expect(html).toContain(`id="${heading.id}"`);
    }
  });

  it("cannot be used to clobber DOM globals through a heading", async () => {
    const { headings } = await renderMarkdown("# __proto__\n\n# cookie\n\n# constructor");
    for (const heading of headings) expect(heading.id.startsWith("md-")).toBe(true);
  });

  it("keeps the sanitizer's prefix on footnote ids", async () => {
    const { html } = await renderMarkdown("note[^a]\n\n[^a]: text");
    expect(html).toContain("user-content-fn-a");
  });
});

describe("code highlighting", () => {
  it("tokenises supported languages and their aliases", async () => {
    for (const language of [
      "js",
      "javascript",
      "ts",
      "json",
      "bash",
      "python",
      "sql",
      "yaml",
      "css",
      "html",
      "diff",
      "md",
    ]) {
      const { html } = await renderMarkdown("```" + language + "\nconst a = 1; // x\n```");
      expect(html, language).toContain('class="language-');
      expect(html, language).toContain("hljs");
    }
    const { html } = await renderMarkdown("```js\nconst a = 1;\n```");
    expect(html).toContain("hljs-keyword");
  });

  it("leaves unknown languages as plain text and cannot inject attributes through the fence info string", async () => {
    const plain = await renderMarkdown("```nonsense\nconst a = 1;\n```");
    expect(plain.html).not.toContain("hljs-keyword");
    const injected = await renderMarkdown('```js" onmouseover="alert(1)\nconst a = 1;\n```');
    assertSafeDom(injected.html, "fence info string");
  });

  it("escapes code content so markup inside a block is shown, not parsed", async () => {
    const { html } = await renderMarkdown("```html\n<script>alert(1)</script>\n```");
    assertSafeDom(html, "code block");
    expect(html).toContain("&#x3C;");
  });
});

describe("robustness", () => {
  it("renders a 1 MB prose, heading and code document in reasonable time", async () => {
    const block =
      "## Heading\n\nParagraph with **bold**, `code` and a [link](https://example.com).\n\n```js\nconst a = 1;\n```\n\n";
    const source = block.repeat(Math.ceil(1_000_000 / block.length));
    const started = performance.now();
    const { html, headings } = await renderMarkdown(source);
    expect(html.length).toBeGreaterThan(source.length / 2);
    expect(headings.length).toBeGreaterThan(1000);
    expect(performance.now() - started).toBeLessThan(15_000);
  }, 30_000);

  it("renders a 250 KB document full of lists in reasonable time (the parser is super-linear on lists)", async () => {
    const block = "## Heading\n\nParagraph with **bold**.\n\n- item\n- item\n\n";
    const source = block.repeat(Math.ceil(250_000 / block.length));
    const started = performance.now();
    await renderMarkdown(source);
    expect(performance.now() - started).toBeLessThan(15_000);
  }, 30_000);

  it("handles deeply nested lists and quotes without throwing", async () => {
    await expect(renderMarkdown("> ".repeat(500) + "deep")).resolves.toBeDefined();
    await expect(
      renderMarkdown(
        "- a\n" +
          " ".repeat(0) +
          Array.from({ length: 200 }, (_, i) => " ".repeat(i + 2) + "- b").join("\n"),
      ),
    ).resolves.toBeDefined();
  });

  it("is deterministic", async () => {
    const source = "# a\n\n```js\nlet x\n```\n\n[l](https://e.com)";
    expect((await renderMarkdown(source)).html).toBe((await renderMarkdown(source)).html);
  });
});
