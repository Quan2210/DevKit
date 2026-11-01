import type { Config } from "@react-router/dev/config";
import { getBase } from "./config/env.mjs";
import { routableTools, toolPath } from "./src/registry/tools.meta";

export default {
  appDirectory: "src",
  ssr: false,
  basename: getBase(),
  // Every route is prerendered; `/404` matches the splat route and is copied to 404.html by scripts/stage.mjs.
  async prerender() {
    return ["/", "/404", ...routableTools().map(toolPath)];
  },
} satisfies Config;
