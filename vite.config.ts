import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { getBase } from "./config/env.mjs";

// `base` must equal React Router's `basename`; without it the build exits silently (see docs/design/ssg-spike.md).
export default defineConfig(({ mode }) => ({
  base: getBase(mode),
  plugins: [tailwindcss(), reactRouter()],
}));
