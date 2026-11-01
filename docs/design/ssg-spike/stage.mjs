import { cpSync, rmSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
const src = "build/client", out = "stage", base = process.argv[2] || "DevKit";
rmSync(out, { recursive: true, force: true }); mkdirSync(out);
for (const f of readdirSync(src)) if (f !== base && f !== "index.html") cpSync(join(src, f), join(out, f), { recursive: true });
cpSync(join(src, base), out, { recursive: true });
cpSync(join(out, "404", "index.html"), join(out, "404.html"));
console.log("staged ->", out, readdirSync(out));
