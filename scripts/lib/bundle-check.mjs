import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Strings that only appear in heavy, route-specific libraries (SD-11). */
const HEAVY_MARKERS = ["cm-editor", "cm-content", "micromark", "lowlight", "hljs-"];
const FORBIDDEN_CODE = [
  { pattern: /\beval\(/, label: "eval(" },
  { pattern: /new Function\(/, label: "new Function(" },
];
const SECRET_PATTERNS = [
  { pattern: /AKIA[0-9A-Z]{16}/, label: "AWS access key" },
  { pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, label: "private key" },
  { pattern: /ghp_[A-Za-z0-9]{36}/, label: "GitHub token" },
  { pattern: /sk-[A-Za-z0-9]{32,}/, label: "API secret key" },
];

function listFiles(dir, extension) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(extension))
    .map((name) => join(dir, name));
}

function listJs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".js"))
    .map((name) => join(dir, name));
}

/**
 * Bundle guards: Home must not load heavy libraries, and no chunk may contain eval/new Function or secrets.
 * @param {string} root deploy folder (stage/)
 * @returns {string[]} error messages
 */
export function checkBundle(root) {
  const errors = [];
  const assetsDir = join(root, "assets");

  const home = join(root, "index.html");
  if (existsSync(home)) {
    const html = readFileSync(home, "utf8");
    const referenced = new Set([...html.matchAll(/assets\/([^"'\s)]+\.js)/g)].map((m) => m[1]));
    for (const name of referenced) {
      const file = join(assetsDir, name);
      if (!existsSync(file)) continue;
      const code = readFileSync(file, "utf8");
      for (const marker of HEAVY_MARKERS) {
        if (code.includes(marker))
          errors.push(`index.html loads assets/${name} which contains "${marker}"`);
      }
    }
  } else errors.push("index.html: missing");

  for (const file of listJs(assetsDir)) {
    const code = readFileSync(file, "utf8");
    const short = file.slice(root.length + 1);
    for (const { pattern, label } of FORBIDDEN_CODE) {
      if (pattern.test(code)) errors.push(`${short}: contains ${label}`);
    }
    for (const { pattern, label } of SECRET_PATTERNS) {
      if (pattern.test(code)) errors.push(`${short}: looks like it contains a ${label}`);
    }
  }

  // Fonts inlined as data: URIs are blocked by `font-src 'self'` (found in the M1 browser check).
  for (const file of listFiles(assetsDir, ".css")) {
    if (/url\(\s*["']?data:(font|application\/(x-)?font)/.test(readFileSync(file, "utf8"))) {
      errors.push(`${file.slice(root.length + 1)}: contains a data: font that the CSP would block`);
    }
  }
  return errors;
}
