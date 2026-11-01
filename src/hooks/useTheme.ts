import { useSyncExternalStore } from "react";
import { getServerTheme, getTheme, setTheme, subscribeTheme, type Theme } from "../lib/theme";

/** Theme choice with the server snapshot "system", so prerender and hydration agree. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);
  return [theme, setTheme];
}
