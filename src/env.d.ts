/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin only, e.g. https://devkit.example (no base path, no trailing slash). */
  readonly VITE_SITE_URL?: string;
}
