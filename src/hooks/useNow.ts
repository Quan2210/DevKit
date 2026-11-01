import { useEffect, useState } from "react";

/** Current time in ms, refreshed every `intervalMs`. Only read it for client-side results (not prerendered). */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
