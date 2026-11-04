import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";
import { useRef, useState } from "react";
import { useT } from "../../i18n/useT";
import { cn } from "../../lib/cn";

export interface SplitWorkspaceProps {
  left: ReactNode;
  right: ReactNode;
  /** Controls between the two sides: a column from lg, a row below. */
  actions?: ReactNode;
}

const MIN = 0.2;
const MAX = 0.8;
const STEP = 0.02;
const clampRatio = (value: number) => Math.min(MAX, Math.max(MIN, value));

/**
 * Left | middle | right: three columns from lg, stacked below. The workspace fills the viewport
 * below the top nav. The middle strip is a drag handle (and a separator for the keyboard) that
 * resizes the two sides; the controls inside it keep working because they sit on top of it.
 */
export function SplitWorkspace({ left, right, actions }: SplitWorkspaceProps) {
  const t = useT();
  const grid = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(0.5);
  const [dragging, setDragging] = useState(false);

  const move = (clientX: number) => {
    const element = grid.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const middle = element.children[1]?.getBoundingClientRect().width ?? 0;
    const free = rect.width - middle;
    if (free <= 0) return;
    setRatio(clampRatio((clientX - rect.left - middle / 2) / free));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is only a convenience; dragging still works without it.
    }
    setDragging(true);
    move(event.clientX);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging) move(event.clientX);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") setRatio((value) => clampRatio(value - STEP));
    else if (event.key === "ArrowRight") setRatio((value) => clampRatio(value + STEP));
    else if (event.key === "Home") setRatio(0.5);
    else return;
    event.preventDefault();
  };

  const style = { "--left": `${ratio}fr`, "--right": `${1 - ratio}fr` } as CSSProperties;

  return (
    <div
      ref={grid}
      style={style}
      className={cn(
        "grid gap-2 lg:h-[calc(100dvh-var(--topnav-h,3rem)-6.5rem)] lg:min-h-[24rem] lg:gap-0",
        "lg:grid-cols-[minmax(0,var(--left))_auto_minmax(0,var(--right))]",
        dragging && "lg:select-none",
      )}
    >
      <div className="h-[55dvh] min-h-72 lg:h-auto [&>section]:h-full">{left}</div>
      <div
        className={cn(
          "relative flex items-center justify-center lg:min-w-6",
          actions ? "lg:px-1.5" : "",
        )}
      >
        <div
          role="slider"
          aria-label={t("split.resize")}
          aria-valuemin={Math.round(MIN * 100)}
          aria-valuemax={Math.round(MAX * 100)}
          aria-valuenow={Math.round(ratio * 100)}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onDoubleClick={() => setRatio(0.5)}
          onKeyDown={onKeyDown}
          className={cn(
            "absolute inset-0 hidden touch-none lg:block lg:cursor-col-resize",
            "after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border",
            "hover:after:w-0.5 hover:after:bg-primary focus-visible:after:w-0.5 focus-visible:after:bg-primary",
            dragging && "after:w-0.5 after:bg-primary",
          )}
        />
        {actions ? (
          <div
            role="toolbar"
            aria-label={t("toolshell.actions")}
            className="pointer-events-none relative flex flex-row flex-wrap items-start justify-center gap-4 lg:flex-col lg:flex-nowrap lg:items-stretch [&>*]:pointer-events-auto"
          >
            {actions}
          </div>
        ) : null}
      </div>
      <div className="h-[55dvh] min-h-72 lg:h-auto [&>section]:h-full">{right}</div>
    </div>
  );
}
