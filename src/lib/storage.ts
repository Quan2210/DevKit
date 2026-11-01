/** Every key is versioned and prefixed; only `mdDraft` ever holds user-entered content. */
export const STORAGE_KEYS = {
  theme: "devkit:v1:theme",
  recentColors: "devkit:v1:recent-colors",
  mdView: "devkit:v1:md-view",
  mdDocWidth: "devkit:v1:md-doc-width",
  mdBannerDismissed: "devkit:v1:md-banner-dismissed",
  mdDraftEnabled: "devkit:v1:md-draft-enabled",
  mdDraft: "devkit:v1:md-draft",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export interface SafeStorage {
  /** True when values survive a reload (the real backend worked on the last write). */
  readonly persistent: boolean;
  /** Read and validate; returns `fallback` for missing, corrupt or invalid values. */
  read<T>(key: StorageKey, parse: (raw: unknown) => T | undefined, fallback: T): T;
  /** Returns false when the backend refused the write (the value is then kept in memory only). */
  write(key: StorageKey, value: unknown): boolean;
  remove(key: StorageKey): void;
}

type Backend = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultBackend(): Backend | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // accessing localStorage can throw (blocked site data, sandboxed frames)
  }
}

export function createStorage(getBackend: () => Backend | null = defaultBackend): SafeStorage {
  const memory = new Map<string, string>();
  let persistent = true;

  const backend = (): Backend | null => {
    try {
      return getBackend();
    } catch {
      return null;
    }
  };

  return {
    get persistent() {
      return persistent && backend() !== null;
    },
    read(key, parse, fallback) {
      let raw: string | null | undefined;
      try {
        raw = backend()?.getItem(key);
      } catch {
        raw = undefined;
      }
      raw ??= memory.get(key);
      if (raw === null || raw === undefined) return fallback;
      try {
        return parse(JSON.parse(raw)) ?? fallback;
      } catch {
        return fallback;
      }
    },
    write(key, value) {
      const serialized = JSON.stringify(value);
      memory.set(key, serialized);
      try {
        const target = backend();
        if (!target) {
          persistent = false;
          return false;
        }
        target.setItem(key, serialized);
        persistent = true;
        return true;
      } catch {
        persistent = false;
        return false;
      }
    },
    remove(key) {
      memory.delete(key);
      try {
        backend()?.removeItem(key);
      } catch {
        // nothing to clean up if the backend is unavailable
      }
    },
  };
}

export const storage = createStorage();
