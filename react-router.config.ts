import type { Config } from "@react-router/dev/config";
import { getBase } from "./config/env.mjs";

export default {
  appDirectory: "src",
  ssr: false,
  basename: getBase(),
  // `/404` matches the splat route and is copied to 404.html by scripts/stage.mjs.
  async prerender() {
    return ["/", "/404"];
  },
} satisfies Config;
