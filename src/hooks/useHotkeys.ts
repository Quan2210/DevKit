import { useEffect, useRef } from "react";

export interface Hotkey {
  /** `KeyboardEvent.key`, compared case-insensitively. */
  key: string;
  /** Require Ctrl (or Cmd on macOS). */
  mod?: boolean;
  shift?: boolean;
  /** Fire even while typing in an input, textarea or editor. Off by default. */
  allowInInput?: boolean;
  handler: (event: KeyboardEvent) => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** Document-level shortcuts (docs/design/ui-direction.md §5). Plain keys never fire while typing. */
export function useHotkeys(hotkeys: Hotkey[], enabled = true): void {
  const ref = useRef(hotkeys);
  useEffect(() => {
    ref.current = hotkeys;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      for (const hotkey of ref.current) {
        const mod = event.ctrlKey || event.metaKey;
        if (event.key.toLowerCase() !== hotkey.key.toLowerCase()) continue;
        if (Boolean(hotkey.mod) !== mod) continue;
        if (Boolean(hotkey.shift) !== event.shiftKey) continue;
        if (!hotkey.allowInInput && !hotkey.mod && isTypingTarget(event.target)) continue;
        event.preventDefault();
        hotkey.handler(event);
        return;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
