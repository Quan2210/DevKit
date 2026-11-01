import { UuidGenerator } from "../../features/uuid-generator/UuidGenerator";
import { toolMeta } from "../../lib/seo";
import { getTool } from "../../registry/tools.meta";

export const meta = () => toolMeta(getTool("uuid"));

/** One failing tool must not take down the rest of the app (SD-10). */
export { ToolErrorBoundary as ErrorBoundary } from "../../components/common/ToolErrorBoundary";

export default function UuidGeneratorRoute() {
  return <UuidGenerator />;
}
