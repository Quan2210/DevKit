import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { getBase } from "./config/env.mjs";

// `base` must equal React Router's `basename`; without it the build exits silently (see docs/design/ssg-spike.md).
export default defineConfig(({ mode }) => ({
  base: getBase(mode),
  // Never inline assets as data: URIs: the CSP only allows fonts from 'self' (docs/04 Change 1.14b).
  build: { assetsInlineLimit: 0 },
  worker: { format: "es" },
  resolve: {
    alias: {
      // The package's "browser" export decodes entities through `document`, which does not exist in a
      // Web Worker (found when the Markdown worker failed in a real browser). Use the DOM-free build.
      "decode-named-character-reference": fileURLToPath(
        new URL("./node_modules/decode-named-character-reference/index.js", import.meta.url),
      ),
    },
  },
  plugins: [tailwindcss(), reactRouter()],
}));
