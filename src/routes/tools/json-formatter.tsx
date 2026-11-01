import { JsonFormatter } from "../../features/json-formatter/JsonFormatter";
import { toolMeta } from "../../lib/seo";
import { getTool } from "../../registry/tools.meta";

export const meta = () => toolMeta(getTool("json"));

/** One failing tool must not take down the rest of the app (SD-10). */
export { ToolErrorBoundary as ErrorBoundary } from "../../components/common/ToolErrorBoundary";

export default function JsonFormatterRoute() {
  return <JsonFormatter />;
}
