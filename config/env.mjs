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
