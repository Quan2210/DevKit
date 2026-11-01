import { loadEnv } from "vite";

/**
 * Base path of the deployment, always with a leading and trailing slash.
 * @param {string} [mode]
 * @returns {string}
 */
export function getBase(mode = "production") {
  const raw = loadEnv(mode, process.cwd(), "VITE_").VITE_BASE ?? "/";
  const trimmed = raw.replace(/^\/+|\/+$/g, "");
  return trimmed === "" ? "/" : `/${trimmed}/`;
}

/**
 * Site origin (no base path, no trailing slash). Mirrors src/lib/url.ts so build scripts
 * and the app agree on canonical URLs.
 * @param {string} [mode]
 * @returns {string}
 */
export function getSiteUrl(mode = "production") {
  return loadEnv(mode, process.cwd(), "VITE_").VITE_SITE_URL ?? "http://localhost:4173";
}
