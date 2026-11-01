// Static server for the staged build that behaves like GitHub Pages / Cloudflare Pages:
// files under the base path, directory index.html, and 404.html with status 404 for everything else.
// Usage: node scripts/serve.mjs [dir=stage] [port=4173]   (base path comes from VITE_BASE)
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { getBase } from "../config/env.mjs";

const root = resolve(process.argv[2] ?? "stage");
const port = Number(process.argv[3] ?? 4173);
const base = getBase();

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};

/** Headers from the generated `_headers` file ("/*" rule only), as Cloudflare would send them. */
function siteHeaders() {
  const file = join(root, "_headers");
  if (!existsSync(file)) return {};
  const headers = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s+([A-Za-z-]+):\s*(.+)$/);
    if (match) headers[match[1]] = match[2];
  }
  return headers;
}

// Read per request so a rebuild never leaves the server sending the previous build's CSP hashes.
const extraHeaders = () => (process.env.SERVE_HEADERS === "0" ? {} : siteHeaders());

function send(response, status, body, type) {
  response.writeHead(status, { "Content-Type": type, ...extraHeaders() });
  response.end(body);
}

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  const notFound = () => send(response, 404, readFileSync(join(root, "404.html")), types[".html"]);

  if (!pathname.startsWith(base)) return notFound();
  let file = normalize(join(root, pathname.slice(base.length)));
  if (!file.startsWith(root)) return notFound(); // path traversal guard
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) return notFound();
  send(response, 200, readFileSync(file), types[extname(file)] ?? "application/octet-stream");
}).listen(port, () => console.log(`serving ${root} at http://localhost:${port}${base}`));
