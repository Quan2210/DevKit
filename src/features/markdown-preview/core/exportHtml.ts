const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain, self-contained styling for the downloaded file. No script, no external resource. */
const STYLE = `body{margin:2rem auto;padding:0 1rem;max-width:75ch;font:16px/1.6 system-ui,sans-serif;color:#0f172a}
h1,h2,h3,h4,h5,h6{line-height:1.25;margin:1.6em 0 .5em}
code,pre{font-family:ui-monospace,Consolas,monospace;font-size:.9em}
pre{padding:1rem;overflow:auto;background:#f1f5f9;border-radius:8px}
code{background:#f1f5f9;padding:.1em .3em;border-radius:4px}
pre code{background:none;padding:0}
blockquote{margin:1em 0;padding-left:1em;border-left:3px solid #94a3b8;color:#475569}
table{border-collapse:collapse}
th,td{border:1px solid #cbd5e1;padding:.4em .7em}
.md-blocked-image{border:1px dashed #94a3b8;padding:.1em .4em;color:#475569}
a{color:#4338ca}`;

/** Wrap already-sanitized body HTML in a standalone document. `title` is escaped; the body is trusted output of the pipeline. */
export function buildHtmlDocument(bodyHtml: string, title: string): string {
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<article>
${bodyHtml}
</article>
</body>
</html>
`;
}
