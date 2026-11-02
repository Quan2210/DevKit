/**
 * Join an origin, a base path and a page path into one absolute URL.
 * Pure (no env access) so build scripts and unit tests can share it.
 * Non-root pages get a trailing slash because the prerender emits `<path>/index.html`.
 */
export function joinUrl(origin: string, base: string, path: string): string {
  const parts = [base, path]
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter((part) => part !== "");
  const pathname = parts.length === 0 ? "/" : `/${parts.join("/")}/`;
  return `${origin.replace(/\/+$/, "")}${pathname}`;
}

/** Absolute URL of a file under the base path (no trailing slash, unlike a page URL). */
export function joinAssetUrl(origin: string, base: string, file: string): string {
  const parts = [base, file]
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter((part) => part !== "");
  return `${origin.replace(/\/+$/, "")}/${parts.join("/")}`;
}
