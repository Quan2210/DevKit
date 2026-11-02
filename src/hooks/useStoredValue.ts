import { useCallback, useSyncExternalStore } from "react";
import { storage, type StorageKey } from "../lib/storage";

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith("devkit:")) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const notify = () => listeners.forEach((listener) => listener());

/**
 * A persisted primitive (string or boolean) that is hydration-safe: the server and the first
 * client render use `fallback`, then the stored value applies. Changes in other tabs are followed.
 */
export function useStoredValue<T extends string | boolean>(
  key: StorageKey,
  parse: (raw: unknown) => T | undefined,
  fallback: T,
): [value: T, set: (next: T) => void, remove: () => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => storage.read(key, parse, fallback),
    () => fallback,
  );
  const set = useCallback(
    (next: T) => {
      storage.write(key, next);
      notify();
    },
    [key],
  );
  const remove = useCallback(() => {
    storage.remove(key);
    notify();
  }, [key]);
  return [value, set, remove];
}

export const parseString = (raw: unknown): string | undefined =>
  typeof raw === "string" ? raw : undefined;
export const parseBoolean = (raw: unknown): boolean | undefined =>
  typeof raw === "boolean" ? raw : undefined;
