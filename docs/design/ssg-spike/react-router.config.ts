import type { Config } from "@react-router/dev/config";
export default {
  appDirectory: "src",
  ssr: false,
  basename: process.env.VITE_BASE ?? "/",
  async prerender() {
    return ["/", "/tools/demo", "/404"];
  },
} satisfies Config;
