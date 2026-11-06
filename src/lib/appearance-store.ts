/**
 * The saved appearance (src/lib/appearance.ts): load, change, apply to <html>, follow other tabs.
 * `public/theme-init.js` applies the same saved values before first paint.
 */
import {
  ATTRS,
  DEFAULT_APPEARANCE,
  parseStored,
  resolveAppearance,
  toStored,
  type Appearance,
  type StoredAppearance,
} from "./appearance";
import { STORAGE_KEYS, storage } from "./storage";

const listeners = new Set<() => void>();
let current: StoredAppearance | null | undefined;
let bound = false;

function load(): StoredAppearance | null {
  if (current === undefined) current = storage.read(STORAGE_KEYS.appearance, parseStored, null);
  return current;
}

/** Puts the values on <html>, replacing whatever an earlier appearance left there. */
function apply(stored: StoredAppearance | null): void {
  const root = document.documentElement;
  for (const name of Array.from(root.style)) {
    if (name.startsWith("--ap-")) root.style.removeProperty(name);
  }
  for (const attr of ATTRS) root.removeAttribute(attr);
  if (!stored) return;
  for (const [name, value] of Object.entries(stored.vars)) root.style.setProperty(name, value);
  for (const attr of stored.attrs) root.setAttribute(attr, "");
}

const notify = () => listeners.forEach((listener) => listener());

/** Stable between changes, as `useSyncExternalStore` requires. */
export function getStoredAppearance(): StoredAppearance | null {
  return load();
}

export function getServerAppearance(): StoredAppearance | null {
  return null;
}

export function toAppearance(stored: StoredAppearance | null): Appearance {
  return stored
    ? { base: stored.base, regions: stored.regions, navStyle: stored.navStyle }
    : DEFAULT_APPEARANCE;
}

/** Saves and applies a choice; the default look (no base colour) clears everything. */
export function setAppearance(appearance: Appearance): void {
  const resolved = resolveAppearance(appearance);
  if (!resolved) {
    resetAppearance();
    return;
  }
  const stored = toStored(appearance, resolved);
  storage.write(STORAGE_KEYS.appearance, stored);
  current = stored;
  apply(stored);
  notify();
}

export function resetAppearance(): void {
  storage.remove(STORAGE_KEYS.appearance);
  current = null;
  apply(null);
  notify();
}

export function subscribeAppearance(listener: () => void): () => void {
  listeners.add(listener);
  if (!bound) {
    bound = true;
    apply(load());
    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEYS.appearance && event.key !== null) return;
      current = undefined;
      apply(load());
      notify();
    });
  }
  return () => listeners.delete(listener);
}
