import { describe, expect, it } from "vitest";
import { createStorage, STORAGE_KEYS } from "./storage";

const asString = (raw: unknown) => (typeof raw === "string" ? raw : undefined);

function fakeBackend(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe("createStorage", () => {
  it("round-trips a validated value and reports persistence", () => {
    const backend = fakeBackend();
    const storage = createStorage(() => backend);
    expect(storage.write(STORAGE_KEYS.theme, "dark")).toBe(true);
    expect(storage.read(STORAGE_KEYS.theme, asString, "system")).toBe("dark");
    expect(storage.persistent).toBe(true);
  });

  it("returns the fallback for missing, corrupt and invalid values", () => {
    const backend = fakeBackend({ [STORAGE_KEYS.theme]: "{not json" });
    const storage = createStorage(() => backend);
    expect(storage.read(STORAGE_KEYS.theme, asString, "system")).toBe("system");
    backend.data.set(STORAGE_KEYS.theme, "42");
    expect(storage.read(STORAGE_KEYS.theme, asString, "system")).toBe("system");
    expect(storage.read(STORAGE_KEYS.mdView, asString, "split")).toBe("split");
  });

  it("keeps working in memory when the backend is blocked (SD-9)", () => {
    const storage = createStorage(() => {
      throw new Error("blocked");
    });
    expect(storage.write(STORAGE_KEYS.theme, "light")).toBe(false);
    expect(storage.persistent).toBe(false);
    expect(storage.read(STORAGE_KEYS.theme, asString, "system")).toBe("light");
  });

  it("survives a full quota and a missing backend", () => {
    const full = createStorage(() => ({
      getItem: () => null,
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
      removeItem: () => {},
    }));
    expect(full.write(STORAGE_KEYS.recentColors, ["#fff"])).toBe(false);
    expect(
      full.read(STORAGE_KEYS.recentColors, (raw) => (Array.isArray(raw) ? raw : undefined), []),
    ).toEqual(["#fff"]);

    const none = createStorage(() => null);
    expect(none.write(STORAGE_KEYS.theme, "dark")).toBe(false);
  });

  it("removes a key everywhere", () => {
    const backend = fakeBackend();
    const storage = createStorage(() => backend);
    storage.write(STORAGE_KEYS.mdDraft, "secret");
    storage.remove(STORAGE_KEYS.mdDraft);
    expect(backend.data.has(STORAGE_KEYS.mdDraft)).toBe(false);
    expect(storage.read(STORAGE_KEYS.mdDraft, asString, "")).toBe("");
  });
});
