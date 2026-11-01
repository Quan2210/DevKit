import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const root = process.argv[2];
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") && files.push(p); } })(root);
const re = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/g;
const hashes = new Set(); const perFile = {};
for (const f of files) {
  const html = readFileSync(f, "utf8").replace(/\r\n/g, "\n");
  perFile[f] = 0;
  for (const m of html.matchAll(re)) { hashes.add("'sha256-" + createHash("sha256").update(m[2], "utf8").digest("base64") + "'"); perFile[f]++; }
}
const csp = ["default-src 'self'", "script-src 'self' " + [...hashes].join(" "), "style-src 'self' 'unsafe-inline'", "img-src 'self' data: https:", "font-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"].join("; ");
for (const f of files) {
  let html = readFileSync(f, "utf8");
  if (html.includes('http-equiv="Content-Security-Policy"')) continue;
  html = html.replace(/<head>/, `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`);
  writeFileSync(f, html);
}
writeFileSync(join(root, "_csp.txt"), csp);
console.log("html files:", files.length, "unique inline-script hashes:", hashes.size); console.log(perFile);
