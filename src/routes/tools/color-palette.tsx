import { ColorPalette } from "../../features/color-tools/color-palette/ColorPalette";
import { toolMeta } from "../../lib/seo";
import { getTool } from "../../registry/tools.meta";

export const meta = () => toolMeta(getTool("color-palette"));

/** One failing tool must not take down the rest of the app (SD-10). */
export { ToolErrorBoundary as ErrorBoundary } from "../../components/common/ToolErrorBoundary";

export default function ColorPaletteRoute() {
  return <ColorPalette />;
}
