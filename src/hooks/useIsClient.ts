import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False during prerender and the hydration pass, true afterwards. Hydration-safe. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
