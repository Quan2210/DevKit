import { STORAGE_KEYS, storage } from "./storage";

export type Theme = "light" | "dark" | "system";

export const THEMES: ReadonlyArray<Theme> = ["light", "dark", "system"];

const parseTheme = (raw: unknown): Theme | undefined => THEMES.find((theme) => theme === raw);

const listeners = new Set<() => void>();
let crossTabBound = false;

function apply(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Current choice; "system" when nothing valid is stored. */
export function getTheme(): Theme {
  return storage.read(STORAGE_KEYS.theme, parseTheme, "system");
}

export function getServerTheme(): Theme {
  return "system";
}

export function setTheme(theme: Theme): void {
  storage.write(STORAGE_KEYS.theme, theme);
  apply(theme);
  notify();
}

/** useSyncExternalStore subscription. Also follows theme changes made in other tabs. */
export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  if (!crossTabBound) {
    crossTabBound = true;
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEYS.theme) {
        apply(getTheme());
        notify();
      }
    });
  }
  return () => listeners.delete(listener);
}
