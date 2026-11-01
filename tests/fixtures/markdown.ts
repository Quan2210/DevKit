/**
 * Markdown corpus for Markdown Preview (PRD 3.10 and 9.4). Syntax cases assert that rendered HTML
 * contains the listed fragments; security and privacy cases assert it never contains the listed ones.
 */
export interface MarkdownSyntaxCase {
  name: string;
  markdown: string;
  /** Fragments the rendered HTML must contain. */
  contains: string[];
}

export const syntaxCases: MarkdownSyntaxCase[] = [
  { name: "headings", markdown: "# One\n\n###### Six", contains: ["<h1", "One", "<h6", "Six"] },
  {
    name: "emphasis",
    markdown: "*em* **strong** `code`",
    contains: ["<em>em</em>", "<strong>strong</strong>", "<code>code</code>"],
  },
  {
    name: "nested list",
    markdown: "- a\n  - b\n- c",
    contains: ["<ul>", "<li>a", "<li>b", "<li>c"],
  },
  {
    name: "ordered list",
    markdown: "1. one\n2. two",
    contains: ["<ol>", "<li>one</li>", "<li>two</li>"],
  },
  {
    name: "task list",
    markdown: "- [x] done\n- [ ] todo",
    contains: ['type="checkbox"', "checked", "disabled", "done", "todo"],
  },
  {
    name: "table with alignment",
    markdown: "| a | b |\n|:--|--:|\n| 1 | 2 |",
    contains: ["<table>", "<th", "<td", "1", "2"],
  },
  {
    name: "fenced code with language",
    markdown: "```js\nconst a = 1;\n```",
    contains: ["<pre>", "<code", "const"],
  },
  {
    name: "fenced code without language",
    markdown: "```\nplain\n```",
    contains: ["<pre>", "plain"],
  },
  {
    name: "blockquote",
    markdown: "> quote\n>> nested",
    contains: ["<blockquote>", "quote", "nested"],
  },
  {
    name: "link",
    markdown: "[DevKit](https://example.com)",
    contains: ['href="https://example.com"', "DevKit"],
  },
  {
    name: "autolink",
    markdown: "see https://example.com now",
    contains: ['href="https://example.com"'],
  },
  { name: "strikethrough", markdown: "~~gone~~", contains: ["<del>gone</del>"] },
  { name: "footnote", markdown: "text[^1]\n\n[^1]: the note", contains: ["the note", "footnote"] },
  { name: "escaped characters", markdown: "\\*not em\\*", contains: ["*not em*"] },
  { name: "horizontal rule", markdown: "a\n\n---\n\nb", contains: ["<hr"] },
];

export interface MarkdownSecurityCase {
  name: string;
  markdown: string;
  /** Fragments that must NOT appear in the rendered or exported HTML (case-insensitive). */
  mustNotContain: string[];
}

export const securityCases: MarkdownSecurityCase[] = [
  {
    name: "script tag",
    markdown: "<script>window.__pwned = 1</script>",
    mustNotContain: ["<script", "__pwned"],
  },
  {
    name: "img onerror",
    markdown: '<img src=x onerror="window.__pwned=1">',
    mustNotContain: ["onerror", "__pwned"],
  },
  {
    name: "javascript link",
    markdown: "[click](javascript:window.__pwned=1)",
    mustNotContain: ["javascript:"],
  },
  {
    name: "javascript link with whitespace trick",
    markdown: "[click](  JaVaScRiPt:alert(1))",
    mustNotContain: ["javascript:"],
  },
  {
    name: "iframe",
    markdown: '<iframe src="https://evil.example"></iframe>',
    mustNotContain: ["<iframe"],
  },
  { name: "style tag", markdown: "<style>body{display:none}</style>", mustNotContain: ["<style"] },
  {
    name: "inline style attribute",
    markdown: '<p style="position:fixed">x</p>',
    mustNotContain: ["style="],
  },
  {
    name: "svg with onload",
    markdown: '<svg onload="window.__pwned=1"></svg>',
    mustNotContain: ["<svg", "onload"],
  },
  {
    name: "data html link",
    markdown: "[x](data:text/html,<script>alert(1)</script>)",
    mustNotContain: ["data:text/html"],
  },
  {
    name: "form",
    markdown: '<form action="https://evil.example"><input name="p"></form>',
    mustNotContain: ["<form", "evil.example"],
  },
  {
    name: "object and embed",
    markdown: '<object data="x"></object><embed src="x">',
    mustNotContain: ["<object", "<embed"],
  },
  {
    name: "id clobbering",
    markdown: '<a id="__proto__" name="cookie">x</a>',
    mustNotContain: ['id="__proto__"', 'name="cookie"'],
  },
  {
    name: "svg image",
    markdown: "![x](data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=)",
    mustNotContain: ["data:image/svg+xml"],
  },
];

/** Privacy: with the default settings no external image URL may reach the DOM, so no request is made. */
export const externalImageCases: MarkdownSecurityCase[] = [
  {
    name: "https image",
    markdown: "![t](https://tracker.example/pixel.png)",
    mustNotContain: ['src="https://tracker.example', "srcset"],
  },
  {
    name: "http image",
    markdown: "![t](http://tracker.example/pixel.png)",
    mustNotContain: ['src="http://tracker.example'],
  },
  {
    name: "protocol-relative image",
    markdown: "![t](//tracker.example/pixel.png)",
    mustNotContain: ['src="//tracker.example'],
  },
  {
    name: "html image",
    markdown: '<img src="https://tracker.example/pixel.png">',
    mustNotContain: ['src="https://tracker.example'],
  },
];

/** Allowed: small inline images do not leave the browser. */
export const dataImageMarkdown = "![dot](data:image/png;base64,iVBORw0KGgo=)";
