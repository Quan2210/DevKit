import { joinAssetUrl, joinUrl } from "./url-core";

/** Used only when VITE_SITE_URL is not set (local builds). Production builds must set it. */
export const FALLBACK_SITE_URL = "http://localhost:4173";

/** Absolute URL of a page; the single source for canonical, og:url and the sitemap. */
export function buildUrl(path: string): string {
  const origin = import.meta.env.VITE_SITE_URL ?? FALLBACK_SITE_URL;
  return joinUrl(origin, import.meta.env.BASE_URL, path);
}

/** Absolute URL of a static file such as the Open Graph image. */
export function buildAssetUrl(file: string): string {
  const origin = import.meta.env.VITE_SITE_URL ?? FALLBACK_SITE_URL;
  return joinAssetUrl(origin, import.meta.env.BASE_URL, file);
}
