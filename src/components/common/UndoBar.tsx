import { useEffect, useRef, useState } from "react";
import { useT } from "../../i18n/useT";
import { Button } from "./Button";

export interface UndoBarProps {
  message: string;
  onUndo: () => void;
  /** Called when the time runs out; the caller then discards the saved copy. */
  onExpire: () => void;
  durationMs?: number;
}

/** Replaces a confirm dialog for Clear. Pauses while hovered or focused. Never touches storage. */
export function UndoBar({ message, onUndo, onExpire, durationMs = 6000 }: UndoBarProps) {
  const t = useT();
  const [paused, setPaused] = useState(false);
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => expire.current(), durationMs);
    return () => clearTimeout(id);
  }, [paused, durationMs]);

  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm"
    >
      <span>{message}</span>
      <Button variant="ghost" onClick={onUndo}>
        {t("action.undo")}
      </Button>
    </div>
  );
}
