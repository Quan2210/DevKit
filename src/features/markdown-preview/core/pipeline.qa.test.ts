/**
 * Independent QA attack suite for the Markdown pipeline (PRD 3.10, 4.2, 9.4; SD-7, SD-8; R1, R2).
 * Every assertion is made on a real parsed DOM against an allowlist, never on substrings of the HTML.
 */
import { describe, expect, it } from "vitest";
import { buildHtmlDocument } from "./exportHtml";
import { renderMarkdown } from "./pipeline";

const BASE = "https://devkit.test/";

const ALLOWED_TAGS = new Set(
  (
    "a abbr b blockquote br code dd del details div dl dt em h1 h2 h3 h4 h5 h6 hr i img input ins " +
    "kbd li ol p pre q rp rt ruby s samp section span strike strong sub summary sup table tbody td " +
    "tfoot th thead tr tt ul var"
  ).split(" "),
);
const ALLOWED_ATTRS = new Set([
  "href",
  "src",
  "alt",
  "title",
  "id",
  "class",
  "target",
  "rel",
  "align",
  "type",
  "checked",
  "disabled",
  "role",
  "start",
  "referrerpolicy",
  "loading",
  "data-footnote-ref",
  "data-footnote-backref",
  "data-footnotes",
  "aria-label",
  "aria-describedby",
  "width",
  "height",
  "colspan",
  "rowspan",
  "reversed",
  "value",
  "dir",
  "lang",
  "name",
  "cite",
  "longdesc",
  "open",
]);

function parse(html: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
}

/** Fully structural verdict on one rendered fragment. */
function assertSafe(html: string, label: string, external: boolean) {
  const root = parse(html);
  for (const el of Array.from(root.querySelectorAll("*"))) {
    const tag = el.tagName.toLowerCase();
    expect(ALLOWED_TAGS.has(tag), `${label}: element <${tag}>`).toBe(true);
    expect(el.namespaceURI, `${label}: namespace of <${tag}>`).toBe("http://www.w3.org/1999/xhtml");
    if (tag === "input") {
      expect(el.getAttribute("type"), `${label}: input type`).toBe("checkbox");
      expect(el.hasAttribute("disabled"), `${label}: input must be disabled`).toBe(true);
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      expect(name.startsWith("on"), `${label}: ${name}`).toBe(false);
      expect(ALLOWED_ATTRS.has(name), `${label}: unexpected attribute ${name} on <${tag}>`).toBe(
        true,
      );
    }
    if (tag === "a") {
      const href = el.getAttribute("href");
      if (href !== null) {
        const url = new URL(href, BASE);
        expect(["http:", "https:", "mailto:"], `${label}: href ${href}`).toContain(url.protocol);
        // Links that can leave the page must not hand over window.opener or the referrer.
        if (url.origin !== new URL(BASE).origin && url.protocol !== "mailto:") {
          expect(el.getAttribute("target"), `${label}: external link target`).toBe("_blank");
          expect(el.getAttribute("rel"), `${label}: external link rel`).toBe("noopener noreferrer");
        }
      }
      expect(el.hasAttribute("ping"), `${label}: ping`).toBe(false);
    }
    if (tag === "img") {
      const src = el.getAttribute("src") ?? "";
      const isData = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]*$/i.test(src);
      if (!isData) {
        expect(external, `${label}: img src ${src} without opt-in`).toBe(true);
        expect(src, `${label}: img src`).toMatch(/^https?:\/\//i);
        expect(el.getAttribute("referrerpolicy")).toBe("no-referrer");
      }
    }
    // No attribute other than <a href> and <img src> may carry an URL out of the page.
    for (const attr of Array.from(el.attributes)) {
      if (tag === "a" && attr.name === "href") continue;
      if (tag === "img" && attr.name === "src") continue;
      if (attr.name === "cite" || attr.name === "longdesc") {
        expect(attr.value, `${label}: ${attr.name}`).not.toMatch(/^(https?:)?\/\//i);
      }
    }
  }
  // Default mode: nothing that the browser could fetch on its own.
  if (!external) {
    expect(
      root.querySelectorAll(
        "[src]:not(img), [srcset], [poster], [background], [data], [ping], [style]",
      ).length,
      `${label}: fetchable attribute in default mode`,
    ).toBe(0);
    for (const img of root.querySelectorAll("img")) {
      expect(img.getAttribute("src"), `${label}: external img in default mode`).toMatch(
        /^data:image\//i,
      );
    }
  }
  // mXSS: serialising and re-parsing must be a fixed point, otherwise the browser reshapes the tree.
  const once = root.innerHTML;
  const again = parse(once).innerHTML;
  expect(again, `${label}: serialisation is not a fixed point (mutation XSS)`).toBe(once);
}

const PAYLOADS = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  "<svg><style><img src=x onerror=alert(1)></style></svg>",
  "<svg><desc><![CDATA[</desc><script>alert(1)</script>]]></desc></svg>",
  '<math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;img src=1 onerror=alert(1)&gt;">',
  '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
  "<form><math><mtext></form><form><mglyph><style></math><img src onerror=alert(1)>",
  '<a href="javascript:alert(1)" ping="https://evil.example/p">x</a>',
  '<a href="&#x6A;avascript:alert(1)">x</a>',
  '<a href="&Tab;javascript&colon;alert(1)">x</a>',
  "<video poster=https://evil.example/p.png src=https://evil.example/v.mp4></video>",
  "<table background=https://evil.example/b.png><tr><td background=https://evil.example/c.png>x</td></tr></table>",
  "<button formaction=javascript:alert(1)>x</button>",
  '<svg><a xlink:href="javascript:alert(1)"><text>x</text></a></svg>',
  '<svg><use href="data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+#x"/></svg>',
  '<base href="https://evil.example/"><a href="/x">x</a>',
  '<meta http-equiv="refresh" content="0;url=https://evil.example">',
  '<link rel="stylesheet" href="https://evil.example/x.css">',
  "<style>@import url(https://evil.example/x.css);body{background:url(https://evil.example/b)}</style>",
  '<div style="background:url(https://evil.example/b)">x</div>',
  '<iframe src="https://evil.example"></iframe>',
  '<object data="https://evil.example"></object>',
  '<embed src="https://evil.example">',
  "<input type=image src=https://evil.example/i.png>",
  '<img srcset="https://evil.example/a.png 1x" src=x>',
  '<picture><source srcset="https://evil.example/a.png"><img src=x></picture>',
  "<details open ontoggle=alert(1)><summary>x</summary></details>",
  "<marquee onstart=alert(1)>x</marquee>",
  "<!-- <img src=x onerror=alert(1)> -->",
  "<!--><img src=x onerror=alert(1)>-->",
  '<?xml version="1.0"?><img src=x onerror=alert(1)>',
  "<![CDATA[<img src=x onerror=alert(1)>]]>",
  '<img src="x" alt="`onerror=alert(1) ">',
  "&lt;script&gt;alert(1)&lt;/script&gt;",
  "&#60;script&#62;alert(1)&#60;/script&#62;",
  "\\<script>alert(1)\\</script>",
  "[x](javascript:alert(1))",
  "[x](  javascript:alert(1))",
  "[x](<javascript:alert(1)>)",
  "[x](JaVaScRiPt:alert(1))",
  "[x](&#106;avascript:alert(1))",
  "[x](&#x6A;&#x61;vascript:alert(1))",
  "[x](java&#10;script:alert(1))",
  "[x](java&#9;script:alert(1))",
  "[x](%6Aavascript:alert(1))",
  "[x](\\javascript:alert(1))",
  "[x](jаvascript:alert(1))", // Cyrillic a
  "[x](ｊａｖａｓｃｒｉｐｔ:alert(1))", // full-width
  "[x](java​script:alert(1))",
  "[x](java\u0000script:alert(1))",
  "[x](vbscript:msgbox(1))",
  "[x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)",
  "[x](data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+)",
  "[x](blob:https://evil.example/uuid)",
  "[x](file:///etc/passwd)",
  "[x](ftp://evil.example/x)",
  "[x](tel:+1)",
  "[x](/\\evil.example)",
  "[x](\\\\evil.example)",
  '[x]( https://evil.example "t")',
  "![x](data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+)",
  "![x](data:text/html,<script>alert(1)</script>)",
  "![x](DATA:IMAGE/PNG;BASE64,AAAA)",
  '![x](data:image/png;base64,AAAA" onerror="alert(1))',
  "![x](data:image/png;base64,AAAA onerror=alert(1))",
  "![x](data:image/png;charset=x,<svg onload=alert(1)>)",
  "![x](https://evil.example/a.png)",
  "![x](//evil.example/a.png)",
  "![x](HTTPS://evil.example/a.png)",
  '![x](http://evil.example/a.png "title")',
  "![x](/\\evil.example/a.png)",
  "![x](javascript:alert(1))",
  "![x](ftp://evil.example/a.png)",
  "![x](relative/a.png)",
  '!["onerror="alert(1)](https://evil.example/a.png)',
  "![<script>alert(1)</script>](x)",
  "[r1]: javascript:alert(1)\n\n[x][r1] [r1]",
  '[r2]: https://evil.example "<script>alert(1)</script>"\n\n[x][r2]',
  "[^1]: <img src=x onerror=alert(1)>\n\nt[^1]",
  '[^"><img src=x onerror=alert(1)>]: x\n\nt[^"><img src=x onerror=alert(1)>]',
  "[^constructor]: x\n\nt[^constructor] [^__proto__]\n\n[^__proto__]: y",
  "[^a]: [x](javascript:alert(1))\n\nt[^a]",
  "<javascript:alert(1)>",
  '<https://evil.example/"onmouseover="alert(1)>',
  '<foo@bar.example"onmouseover="alert(1)>',
  'https://evil.example/"onmouseover="alert(1)',
  "www.evil.example/<script>alert(1)",
  "javascript:alert(1)",
  "| a | b |\n|:-|-:|\n| <script>alert(1)</script> | [x](javascript:alert(1)) |",
  "| a |\n|---|\n| ![x](https://evil.example/t.png) |",
  "- [x] <img src=x onerror=alert(1)>\n- [ ] [x](javascript:alert(1))",
  '```"><img src=x onerror=alert(1)>\n<img src=x onerror=alert(1)>\n```',
  "```js onclick=alert(1)\n</code></pre><img src=x onerror=alert(1)>\n```",
  "```html\n<script>alert(1)</script><img src=x onerror=alert(1)>\n```",
  "```svg\n<svg onload=alert(1)>\n```",
  "~~~xml\n<![CDATA[</code></pre><script>alert(1)</script>]]>\n~~~",
  "`<img src=x onerror=alert(1)>`",
  "``</code><img src=x onerror=alert(1)>``",
  "# <img src=x onerror=alert(1)>",
  "# [x](javascript:alert(1))",
  "# ![x](https://evil.example/a.png)",
  "Setext <img src=x onerror=alert(1)>\n===",
  "> <script>alert(1)</script>\n> > <img src=x onerror=alert(1)>",
  "*<img src=x onerror=alert(1)>*",
  "**[x](javascript:alert(1))**",
  "1. <img src=x onerror=alert(1)>",
  "<div>\n\n[x](javascript:alert(1))\n\n</div>",
  "<p onclick=alert(1)>x</p>",
  '<a href="https://ok.example" target="_self" rel="opener">x</a>',
  '<a href="https://ok.example" download>x</a>',
  '<a name="__proto__" id="constructor">x</a>',
  "<img name=cookie id=defaultView>",
  "<form id=x><input name=attributes></form>",
  '<h1 id="__proto__">x</h1>',
  "<xmp><script>alert(1)</script></xmp>",
  "<plaintext><script>alert(1)</script>",
  "<textarea><script>alert(1)</script></textarea>",
  "<title><img src=x onerror=alert(1)></title>",
  "<template><script>alert(1)</script></template>",
  "<isindex action=javascript:alert(1)>",
  "\u0000<script>alert(1)</script>",
  "<scr\u0000ipt>alert(1)</scr\u0000ipt>",
  "﻿<script>alert(1)</script>",
  "＜script＞alert(1)＜/script＞",
  "<​script>alert(1)</script>",
  "‮<script>alert(1)</script>",
];

// Each payload is also embedded in structures that change how the parser nests it.
const WRAPPERS: Array<[string, (p: string) => string]> = [
  ["bare", (p) => p],
  ["paragraph", (p) => `before ${p} after`],
  [
    "blockquote",
    (p) =>
      p
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n"),
  ],
  ["list", (p) => `- ${p.split("\n").join("\n  ")}`],
  ["ordered nested", (p) => `1. a\n   - ${p.split("\n").join("\n     ")}`],
  ["table cell", (p) => `| h |\n|---|\n| ${p.replace(/\n/g, " ")} |`],
  ["heading", (p) => `## ${p.replace(/\n/g, " ")}`],
  ["emphasis", (p) => `**_${p.replace(/\n/g, " ")}_**`],
  ["footnote", (p) => `x[^w]\n\n[^w]: ${p.split("\n").join("\n    ")}`],
  ["fence", (p) => "```md\n" + p + "\n```"],
  ["inline code", (p) => "`" + p.replace(/\n/g, " ").replace(/`/g, "'") + "`"],
];

describe("QA: sanitize pipeline attack corpus, structural DOM assertions", () => {
  it("detector self-test: assertSafe really rejects each class of unsafe output", () => {
    const bad = [
      "<script>1</script>",
      "<p onclick=1>x</p>",
      '<a href="javascript:1">x</a>',
      '<a href="https://x.example">x</a>',
      '<img src="https://x.example/a.png" referrerpolicy="no-referrer">',
      '<img src="x.png">',
      "<svg><a>x</a></svg>",
      '<p style="x:y">x</p>',
      '<video poster="https://x.example/p.png"></video>',
    ];
    for (const html of bad) expect(() => assertSafe(html, "self-test", false), html).toThrow();
  });

  it(`runs ${PAYLOADS.length} payloads x ${WRAPPERS.length} contexts x 2 image modes`, async () => {
    let renders = 0;
    for (const payload of PAYLOADS) {
      for (const [wrapName, wrap] of WRAPPERS) {
        for (const external of [false, true]) {
          const source = wrap(payload);
          const { html } = await renderMarkdown(source, { allowExternalImages: external });
          assertSafe(
            html,
            `[${wrapName}${external ? "+ext" : ""}] ${JSON.stringify(payload)}`,
            external,
          );
          renders += 1;
        }
      }
    }
    expect(renders).toBe(PAYLOADS.length * WRAPPERS.length * 2);
  }, 120_000);

  it("default mode: an external image leaves no URL, no src and no request-capable attribute", async () => {
    const { html } = await renderMarkdown(
      "![a](https://tracker.example/1.png) ![b](//tracker.example/2.png) ![c](HTTP://tracker.example/3.png)\n\n" +
        "[![d](https://tracker.example/4.png)](https://ok.example)",
    );
    expect(html).not.toContain("tracker.example/");
    const root = parse(html);
    expect(root.querySelectorAll("img").length).toBe(0);
    expect(root.querySelectorAll(".md-blocked-image").length).toBe(4);
  });

  it("opt-in mode: only http(s) images survive, with no-referrer, protocol-relative upgraded", async () => {
    const { html } = await renderMarkdown(
      "![a](https://t.example/1.png) ![b](//t.example/2.png) ![c](ftp://t.example/3.png) ![d](x.png) ![e](javascript:1)",
      { allowExternalImages: true },
    );
    const imgs = Array.from(parse(html).querySelectorAll("img"));
    expect(imgs.map((i) => i.getAttribute("src"))).toEqual([
      "https://t.example/1.png",
      "https://t.example/2.png",
    ]);
    for (const img of imgs) expect(img.getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  it("data: raster images work in both modes; SVG and non-image data: never", async () => {
    const png = "data:image/png;base64,iVBORw0KGgo=";
    for (const external of [false, true]) {
      const { html } = await renderMarkdown(
        `![ok](${png}) ![svg](data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=) ![h](data:text/html;base64,AAAA)`,
        { allowExternalImages: external },
      );
      const root = parse(html);
      expect(Array.from(root.querySelectorAll("img")).map((i) => i.getAttribute("src"))).toEqual([
        png,
      ]);
    }
  });

  it("absolute-URL links are inert text-links: every external link has target and rel", async () => {
    const { html } = await renderMarkdown(
      "[a](https://a.example) [b](http://b.example) [c](//c.example) <https://d.example> https://e.example www.f.example",
    );
    const anchors = Array.from(parse(html).querySelectorAll("a"));
    expect(anchors.length).toBe(6);
    for (const a of anchors) {
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  // BUG-3: the sanitizer compares the scheme case-sensitively, so a valid upper-case scheme loses its href.
  it("a link whose scheme is written in upper case (HTTP://, MAILTO:) is still a link (BUG-3)", async () => {
    const { html } = await renderMarkdown("[b](HTTP://b.example) [m](MAILTO:a@b.example)");
    const anchors = Array.from(parse(html).querySelectorAll("a"));
    expect(anchors.map((a) => a.hasAttribute("href"))).toEqual([true, true]);
  });

  it("a dangerous link keeps its text but loses the href (no dead active element)", async () => {
    const { html } = await renderMarkdown("[click me](javascript:alert(1))");
    const a = parse(html).querySelector("a");
    expect(a?.textContent).toBe("click me");
    expect(a?.hasAttribute("href")).toBe(false);
  });

  it("raw HTML is reported as dropped, including HTML comments, but not inline code or fences", async () => {
    expect((await renderMarkdown("<b>x</b>")).droppedHtml).toBe(true);
    expect((await renderMarkdown("<!-- c -->")).droppedHtml).toBe(true);
    expect((await renderMarkdown("`<b>x</b>`\n\n```\n<b>x</b>\n```")).droppedHtml).toBe(false);
  });
});

describe("QA: very long and pathological inputs never crash the pipeline or hang", () => {
  const cases: Array<[string, string]> = [
    ["100k open brackets", "[".repeat(100_000)],
    ["50k emphasis openers", "*a ".repeat(50_000)],
    ["50k backticks", "`".repeat(50_000)],
    ["30k angle brackets", "<".repeat(30_000)],
    ["30k autolink starts", "<https://x ".repeat(3_000)],
    ["20k blockquote markers", ">".repeat(20_000)],
    ["2k nested blockquotes with text", ">".repeat(2_000) + " x"],
    ["5k unclosed links", "[a](".repeat(5_000)],
    ["10k reference uses", Array.from({ length: 10_000 }, (_, i) => `[r${i}]`).join(" ")],
    [
      "2k footnote refs",
      Array.from({ length: 2_000 }, (_, i) => `a[^${i}]`).join(" ") +
        "\n\n" +
        Array.from({ length: 2_000 }, (_, i) => `[^${i}]: n`).join("\n"),
    ],
    [
      "2k table columns",
      "|" + "a|".repeat(2_000) + "\n|" + "-|".repeat(2_000) + "\n|" + "b|".repeat(2_000),
    ],
    ["5k-row table", "| a | b |\n|---|---|\n" + "| 1 | 2 |\n".repeat(5_000)],
    ["10k entity run", "&#60;".repeat(10_000) + "&amp;".repeat(10_000)],
    ["200k single-line text", "x".repeat(200_000)],
    ["Unicode: combining marks flood", "e" + "́".repeat(100_000)],
    ["Unicode: astral emoji", "😀".repeat(50_000)],
    ["CRLF + lone CR", "# a\r\n\r\nb\rc\r\n".repeat(5_000)],
    [
      "1 MB of mixed attack text",
      "[x](javascript:1) <img src=x onerror=1> ![i](https://e.example/a.png)\n".repeat(13_000),
    ],
  ];

  it.each(cases)(
    "%s",
    async (_name, source) => {
      const started = Date.now();
      const result = await renderMarkdown(source).then(
        (value) => ({ ok: true as const, value }),
        (error: unknown) => ({ ok: false as const, error }),
      );
      // A failure is allowed only as a rejected promise (the UI shows a banner); a hang is not.
      expect(Date.now() - started).toBeLessThan(15_000);
      if (result.ok) assertSafe(result.value.html.slice(0, 2_000_000), _name, false);
    },
    30_000,
  );

  it("a 2,000-nested blockquote either renders safely or rejects cleanly", async () => {
    const outcome = await renderMarkdown(">".repeat(2_000) + " x").then(
      () => "ok",
      (error: unknown) => (error instanceof Error ? "rejected" : "weird"),
    );
    expect(["ok", "rejected"]).toContain(outcome);
  }, 30_000);
});

describe("QA: syntax edge cases (PRD 3.10 AC: CommonMark/GFM render correctly)", () => {
  it("renders heading levels 1-6 and rejects 7 hashes as text", async () => {
    const { html, headings } = await renderMarkdown(
      "# 1\n## 2\n### 3\n#### 4\n##### 5\n###### 6\n####### 7",
    );
    expect(headings.map((h) => h.depth)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(html).toContain("####### 7");
  });

  it("table alignment is kept as a plain align attribute (no style attribute)", async () => {
    const { html } = await renderMarkdown("| l | c | r |\n|:--|:-:|--:|\n| 1 | 2 | 3 |");
    const aligns = Array.from(parse(html).querySelectorAll("th")).map((th) =>
      th.getAttribute("align"),
    );
    expect(aligns).toEqual(["left", "center", "right"]);
    expect(html).not.toContain("style=");
  });

  it("table with ragged rows and an escaped pipe does not lose cells or crash", async () => {
    const { html } = await renderMarkdown(
      "| a | b |\n|---|---|\n| 1 |\n| 1 | 2 | 3 |\n| x \\| y | z |",
    );
    const root = parse(html);
    expect(root.querySelectorAll("tbody tr").length).toBe(3);
    expect(root.textContent).toContain("x | y");
  });

  it("task lists render disabled checkboxes with the right checked state, including nested and ordered", async () => {
    const { html } = await renderMarkdown("- [x] a\n  - [ ] b\n- [X] c\n- [ ]no space\n\n1. [x] o");
    const boxes = Array.from(parse(html).querySelectorAll("input[type=checkbox]"));
    expect(boxes.map((b) => (b as HTMLInputElement).checked)).toEqual([true, false, true, true]);
    for (const b of boxes) expect((b as HTMLInputElement).disabled).toBe(true);
  });

  it("autolinks: URL, www, email, and trailing punctuation", async () => {
    const { html } = await renderMarkdown(
      "see https://a.example/x). and www.b.example, mail me@c.example.",
    );
    const hrefs = Array.from(parse(html).querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["https://a.example/x", "http://www.b.example", "mailto:me@c.example"]);
  });

  it("strikethrough, escapes, hard break and nested blockquote/list", async () => {
    const { html } = await renderMarkdown("~~x~~ \\*lit\\* a  \nb\n\n> q\n> > n\n>\n> - li");
    const root = parse(html);
    expect(root.querySelector("del")?.textContent).toBe("x");
    expect(root.textContent).toContain("*lit*");
    expect(root.querySelector("br")).not.toBeNull();
    expect(root.querySelector("blockquote blockquote")).not.toBeNull();
    expect(root.querySelector("blockquote ul li")).not.toBeNull();
  });

  it("fenced code: tildes, longer fences, no language, unknown language, uppercase alias", async () => {
    const { html } = await renderMarkdown(
      "~~~\nplain\n~~~\n\n````\n```\ninner\n```\n````\n\n```nope\nx\n```\n\n```JS\nconst a = 1\n```",
    );
    const root = parse(html);
    expect(root.querySelectorAll("pre").length).toBe(4);
    expect(root.querySelector("pre code.hljs .hljs-keyword")?.textContent).toBe("const");
    expect(root.textContent).toContain("```\ninner\n```");
  });

  it("every fence language in the supported list highlights and the rest stay plain", async () => {
    const langs = [
      "javascript",
      "typescript",
      "json",
      "bash",
      "css",
      "xml",
      "python",
      "sql",
      "yaml",
      "markdown",
      "diff",
      "rust",
      "constructor",
      "__proto__",
      "toString",
      "hasOwnProperty",
    ];
    const source = langs.map((l) => "```" + l + "\nx = 1\n```").join("\n\n");
    const { html } = await renderMarkdown(source);
    expect(parse(html).querySelectorAll("pre").length).toBe(langs.length);
  });

  it("footnote: reference and definition are both rendered", async () => {
    const { html } = await renderMarkdown("text[^1]\n\n[^1]: the note");
    const root = parse(html);
    expect(root.querySelector("sup a[data-footnote-ref]")).not.toBeNull();
    expect(root.textContent).toContain("the note");
  });

  it("Vietnamese and CJK text and emoji pass through unchanged", async () => {
    const { html } = await renderMarkdown("# Tiếng Việt: ắ ằ ẳ 日本語 😀\n\nđoạn `mã`");
    expect(parse(html).textContent).toContain("Tiếng Việt: ắ ằ ẳ 日本語 😀");
  });
});

describe("QA: footnote links must work (PRD 3.10 footnote; AC syntax renders correctly)", () => {
  // BUG-1: the sanitizer prefixes ids a second time, so the targets of the footnote links vanish.
  it("every in-page link in a footnote document points at an existing element id (BUG-1)", async () => {
    const { html } = await renderMarkdown("text[^1]\n\n[^1]: the note");
    const root = parse(html);
    const ids = new Set(Array.from(root.querySelectorAll("[id]")).map((e) => e.id));
    const dangling = Array.from(root.querySelectorAll("a[href^='#']"))
      .map((a) => a.getAttribute("href")!.slice(1))
      .filter((id) => !ids.has(id));
    expect(dangling).toEqual([]);
  });

  it("aria-describedby on a footnote reference points at an existing element (BUG-1)", async () => {
    const { html } = await renderMarkdown("text[^1]\n\n[^1]: the note");
    const root = parse(html);
    for (const el of Array.from(root.querySelectorAll("[aria-describedby]"))) {
      expect(
        root.querySelector(`#${CSS.escape(el.getAttribute("aria-describedby")!)}`),
      ).not.toBeNull();
    }
  });
});

describe("QA: heading ids and table of contents", () => {
  // BUG-2: an emoji-only heading falls back to "section" and collides with a real "Section" heading.
  it("heading ids are unique even when a symbol-only heading precedes a heading named Section (BUG-2)", async () => {
    const { headings } = await renderMarkdown("# 😀\n\n# Section");
    const ids = headings.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("repeated and symbol-only headings otherwise get distinct ids", async () => {
    const { headings } = await renderMarkdown("# A\n\n# A\n\n# A\n\n# 😀\n\n# 😀\n\n# !!!");
    const ids = headings.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^md-/);
  });

  it("a heading with markup keeps plain text for the TOC and never leaks HTML into it", async () => {
    const { headings } = await renderMarkdown(
      "# **bold** `code` [link](https://x.example) <b>raw</b>",
    );
    expect(headings[0]?.text).toBe("bold code link raw");
  });

  it("the footnote section is localised and is not a TOC entry", async () => {
    const { headings, html } = await renderMarkdown("# Real\n\nx[^1]\n\n[^1]: n");
    expect(headings.map((h) => h.text)).toEqual(["Real"]);
    expect(html).toContain("Chú thích");
    expect(html).toContain("Quay lại tham chiếu 1");
    expect(html).not.toContain("Footnotes");
    expect(html).not.toContain("Back to reference");
  });
});

describe("QA: exported HTML document (buildHtmlDocument)", () => {
  const exported = async (md: string, external = false) => {
    const { html, headings } = await renderMarkdown(md, { allowExternalImages: external });
    return buildHtmlDocument(html, headings[0]?.text ?? "Tài liệu");
  };
  const asDocument = (text: string) => new DOMParser().parseFromString(text, "text/html");

  it("is a structurally clean standalone document for the whole attack corpus", async () => {
    const corpus = PAYLOADS.join("\n\n");
    for (const external of [false, true]) {
      const doc = asDocument(await exported(corpus, external));
      expect(Array.from(doc.head.children).map((c) => c.tagName)).toEqual([
        "META",
        "META",
        "TITLE",
        "STYLE",
      ]);
      expect(Array.from(doc.body.children).map((c) => c.tagName)).toEqual(["ARTICLE"]);
      expect(
        doc.querySelectorAll(
          "script, iframe, object, embed, form, link, base, svg, math, style:not(head > style)",
        ).length,
      ).toBe(0);
      expect(doc.querySelector("meta[http-equiv]")).toBeNull();
      for (const el of Array.from(doc.querySelectorAll("*"))) {
        for (const attr of Array.from(el.attributes)) {
          expect(attr.name.startsWith("on")).toBe(false);
        }
      }
      assertSafe(doc.querySelector("article")!.innerHTML, `export external=${external}`, external);
    }
  });

  it("the built-in stylesheet cannot fetch anything", () => {
    const css = asDocument(buildHtmlDocument("<p>x</p>", "t")).querySelector("style")!.textContent!;
    expect(css).not.toMatch(/url\(|@import|expression\(|https?:/i);
  });

  it("default export carries no external URL other than clickable links", async () => {
    const doc = asDocument(
      await exported("![a](https://tracker.example/p.png)\n\n[l](https://ok.example)"),
    );
    expect(doc.querySelectorAll("img").length).toBe(0);
    expect(doc.documentElement.outerHTML).not.toContain("tracker.example");
    expect(doc.querySelector("a")?.getAttribute("href")).toBe("https://ok.example");
  });

  it("title: escaped, taken from the first heading, never injectable", async () => {
    const doc = asDocument(
      await exported(String.raw`# \</title>\<script>alert(1)\</script> & "q"`),
    );
    expect(doc.querySelectorAll("script").length).toBe(0);
    expect(doc.title).toBe('</title><script>alert(1)</script> & "q"');
  });

  it("title and body survive a Vietnamese heading with combining characters", async () => {
    const doc = asDocument(await exported("# Tiếng Việt\n\nnội dung"));
    expect(doc.title).toBe("Tiếng Việt");
    expect(doc.querySelector("meta[charset]")?.getAttribute("charset")).toBe("utf-8");
  });

  it("copy-HTML payload (the pipeline body) never includes UI-only elements", async () => {
    const { html } = await renderMarkdown("```js\nconst a = 1\n```");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("md-copy-code");
  });
});
