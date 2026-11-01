import { useCallback, useEffect, useRef, useState } from "react";
import { copyText } from "../lib/io/clipboard";

export type CopyState = "idle" | "copied" | "failed";

/** Copy helper with a short-lived result state for button labels and live regions. */
export function useClipboard(resetMs = 1500) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      const ok = await copyText(text);
      setState(ok ? "copied" : "failed");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), resetMs);
      return ok;
    },
    [resetMs],
  );

  return { copy, state };
}
