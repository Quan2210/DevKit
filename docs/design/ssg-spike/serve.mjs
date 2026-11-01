import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
const root = process.argv[2], base = process.argv[3] || "/", port = +(process.argv[4] || 4173), headerCsp = process.env.HEADER_CSP === "1";
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".data": "text/x-script" };
const csp = existsSync(join(root, "_csp.txt")) ? readFileSync(join(root, "_csp.txt"), "utf8") : "";
createServer((req, res) => {
  let u = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const h = { "Content-Type": "text/plain" }; if (headerCsp && csp) h["Content-Security-Policy"] = csp;
  if (!u.startsWith(base)) { res.writeHead(404, { ...h, "Content-Type": types[".html"] }); return res.end(readFileSync(join(root, "404.html"))); }
  let rel = u.slice(base.length);
  let p = join(root, rel);
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404, { ...h, "Content-Type": types[".html"] }); return res.end(readFileSync(join(root, "404.html"))); }
  res.writeHead(200, { ...h, "Content-Type": types[extname(p)] || "application/octet-stream" }); res.end(readFileSync(p));
}).listen(port, () => console.log("serving", root, "at", base, port));
