import type { ReactNode } from "react";

/**
 * Input | Output workspace: two columns from lg, stacked below (docs/design/layouts.md §1).
 * Each side gets a definite height so the editors inside can fill it and scroll internally.
 */
export function SplitWorkspace({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid gap-4 lg:h-[calc(100dvh-24rem)] lg:min-h-[28rem] lg:grid-cols-2">
      <div className="h-[45dvh] min-h-64 lg:h-auto [&>section]:h-full">{left}</div>
      <div className="h-[45dvh] min-h-64 lg:h-auto [&>section]:h-full">{right}</div>
    </div>
  );
}
