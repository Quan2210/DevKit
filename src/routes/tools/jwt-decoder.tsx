import { JwtDecoder } from "../../features/jwt-decoder/JwtDecoder";
import { toolMeta } from "../../lib/seo";
import { getTool } from "../../registry/tools.meta";

export const meta = () => toolMeta(getTool("jwt"));

/** One failing tool must not take down the rest of the app (SD-10). */
export { ToolErrorBoundary as ErrorBoundary } from "../../components/common/ToolErrorBoundary";

export default function JwtDecoderRoute() {
  return <JwtDecoder />;
}
