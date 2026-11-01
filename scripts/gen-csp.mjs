// Hash every inline <script> of every HTML file and write one site-wide CSP (docs/04 Change 1.14b).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? "stage";
// Cloudflare Pages limits a _headers line (believed ~2,000 chars; verify in M8). Past this, rely on the <meta> CSP.
const HEADER_CSP_MAX = 1900;

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith(".html")) files.push(path);
  }
})(root);

const inlineScript = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;
const hashes = new Set();
for (const file of files) {
  const html = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  for (const match of html.matchAll(inlineScript)) {
    hashes.add(`'sha256-${createHash("sha256").update(match[1], "utf8").digest("base64")}'`);
  }
}

const directives = [
  "default-src 'self'",
  `script-src 'self' ${[...hashes].sort().join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];
const csp = directives.join("; ");

for (const file of files) {
  const html = readFileSync(file, "utf8");
  if (html.includes('http-equiv="Content-Security-Policy"')) continue;
  if (!html.includes("<head>")) throw new Error(`No <head> in ${file}`);
  writeFileSync(
    file,
    html.replace("<head>", `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`),
  );
}

const common = [
  "X-Content-Type-Options: nosniff",
  "Referrer-Policy: strict-origin-when-cross-origin",
];
const headerCsp = `${csp}; frame-ancestors 'none'`;
const headerLines =
  headerCsp.length <= HEADER_CSP_MAX
    ? [...common, `Content-Security-Policy: ${headerCsp}`]
    : [...common, "X-Frame-Options: DENY"];
writeFileSync(join(root, "_headers"), `/*\n${headerLines.map((l) => `  ${l}`).join("\n")}\n`);
console.log(
  `CSP: ${files.length} html files, ${hashes.size} unique inline-script hashes, header CSP ${headerCsp.length <= HEADER_CSP_MAX ? "enabled" : "skipped (meta only)"}`,
);
