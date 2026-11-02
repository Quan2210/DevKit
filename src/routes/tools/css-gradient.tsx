import { CssGradient } from "../../features/color-tools/css-gradient/CssGradient";
import { toolMeta } from "../../lib/seo";
import { getTool } from "../../registry/tools.meta";

export const meta = () => toolMeta(getTool("css-gradient"));

/** One failing tool must not take down the rest of the app (SD-10). */
export { ToolErrorBoundary as ErrorBoundary } from "../../components/common/ToolErrorBoundary";

export default function CssGradientRoute() {
  return <CssGradient />;
}
