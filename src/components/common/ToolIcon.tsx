import {
  Binary,
  Blend,
  Braces,
  Code,
  Contrast,
  Database,
  FileText,
  Fingerprint,
  KeyRound,
  Palette,
  Pipette,
  type LucideIcon,
} from "lucide-react";
import type { ToolIconName } from "../../registry/tools.meta";

const icons: Record<ToolIconName, LucideIcon> = {
  braces: Braces,
  code: Code,
  key: KeyRound,
  binary: Binary,
  fingerprint: Fingerprint,
  "file-text": FileText,
  pipette: Pipette,
  palette: Palette,
  contrast: Contrast,
  blend: Blend,
  database: Database,
};

export function ToolIcon({
  name,
  className = "size-4",
}: {
  name: ToolIconName;
  className?: string;
}) {
  const Icon = icons[name];
  return <Icon aria-hidden className={className} />;
}
