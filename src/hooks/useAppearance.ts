import { useSyncExternalStore } from "react";
import type { Appearance } from "../lib/appearance";
import {
  getServerAppearance,
  getStoredAppearance,
  resetAppearance,
  setAppearance,
  subscribeAppearance,
  toAppearance,
} from "../lib/appearance-store";

/** The saved appearance; the server and the first client render use the default look, like the theme. */
export function useAppearance(): [Appearance, (next: Appearance) => void, () => void] {
  const stored = useSyncExternalStore(
    subscribeAppearance,
    getStoredAppearance,
    getServerAppearance,
  );
  return [toAppearance(stored), setAppearance, resetAppearance];
}
