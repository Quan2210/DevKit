import { Link } from "react-router";
import { useT } from "../../i18n/useT";
import { groupTools } from "../../lib/toolSearch";
import { toolPath, type ToolMeta } from "../../registry/tools.meta";
import { ToolIcon } from "./ToolIcon";

export interface ToolListProps {
  tools: ReadonlyArray<ToolMeta>;
  /** Accessible name of the list region. */
  label: string;
}

/** Home launcher: grouped rows (not identical cards) so a long list stays quick to scan. */
export function ToolList({ tools, label }: ToolListProps) {
  const t = useT();
  return (
    <div aria-label={label} role="region" className="space-y-8">
      {groupTools(tools).map((group) => (
        <section key={group.id} aria-labelledby={`group-${group.id}`}>
          <h2 id={`group-${group.id}`} className="mb-2 text-sm font-semibold text-text-muted">
            {t(group.labelKey)}
          </h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {group.tools.map((tool) => (
              <li key={tool.id}>
                <Link
                  to={toolPath(tool)}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted"
                >
                  <ToolIcon name={tool.icon} className="size-5 shrink-0 text-text-muted" />
                  <span className="min-w-0">
                    <span className="block font-medium">{t(tool.titleKey)}</span>
                    <span className="block text-sm text-text-muted">{t(tool.descriptionKey)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
