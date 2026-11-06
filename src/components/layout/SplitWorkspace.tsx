import type {
  ButtonHTMLAttributes,
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
} from "react";
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
 * Left | middle | right: three columns from lg, stacked below. It fills the height its parent gives
 * it (ToolShell `fill`). The middle strip is a drag handle (and a separator for the keyboard) that
 * resizes the two sides; it starts below the controls, which sit near the top.
 */
/**
 * One control (or one labelled group) in the middle column. Every block is as wide as the column and
 * centres what is inside, so the controls line up whatever their own width is.
 */
export function SplitAction({ children }: { children: ReactNode }) {
  return <div className="flex min-h-10 items-center justify-center lg:w-full">{children}</div>;
}

export interface SplitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  /** The visible name; it is also the accessible name. */
  children: ReactNode;
  variant?: "default" | "primary";
}

/**
 * A control for the middle column: icon and text in one block, as wide as the column (icon above the
 * text from lg, side by side when the column is a row). One word or two, so it never needs a tooltip.
 */
export function SplitButton({
  icon,
  children,
  variant = "default",
  className,
  type = "button",
  ...rest
}: SplitButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 text-center text-sm leading-tight font-medium transition-colors",
        "lg:w-full lg:flex-col lg:gap-1 lg:px-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary"
          ? "border-transparent bg-primary text-on-primary hover:bg-primary-hover"
          : "border-border-strong bg-surface text-text hover:bg-surface-muted",
        className,
      )}
      {...rest}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

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
        "grid grid-cols-[minmax(0,1fr)] gap-2 lg:h-full lg:min-h-[24rem] lg:gap-0",
        "lg:grid-cols-[minmax(0,var(--left))_auto_minmax(0,var(--right))]",
        dragging && "lg:select-none",
      )}
    >
      <div className="h-[55dvh] min-h-72 min-w-0 lg:h-auto [&>section]:h-full">{left}</div>
      <div
        className={cn(
          "relative flex flex-col items-center justify-center lg:min-w-6 lg:justify-start",
          actions ? "lg:px-1.5" : "",
        )}
      >
        {actions ? (
          <div
            role="toolbar"
            aria-label={t("toolshell.actions")}
            className="relative flex flex-row flex-wrap items-start justify-center gap-x-4 gap-y-3 lg:mt-[12dvh] lg:w-28 lg:flex-col lg:flex-nowrap lg:items-stretch"
          >
            {actions}
          </div>
        ) : null}
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
            "relative hidden w-full touch-none lg:block lg:min-h-16 lg:flex-1 lg:cursor-col-resize",
            // The divider exists only here, below the controls: that strip is also what drags
            "after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-border",
            "hover:after:w-0.5 hover:after:bg-primary focus-visible:after:w-0.5 focus-visible:after:bg-primary",
            dragging && "after:w-0.5 after:bg-primary",
          )}
        />
      </div>
      <div className="h-[55dvh] min-h-72 min-w-0 lg:h-auto [&>section]:h-full">{right}</div>
    </div>
  );
}
