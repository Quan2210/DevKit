import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { createStorage, STORAGE_KEYS } from "./storage";

const script = readFileSync(resolve(process.cwd(), "public/theme-init.js"), "utf8");

/** Run public/theme-init.js against a fake page and report the data-theme it sets. */
function themeAfterInit(getItem: () => string | null): string | undefined {
  let applied: string | undefined;
  const context = createContext({
    localStorage: { getItem },
    document: {
      documentElement: { setAttribute: (_name: string, value: string) => (applied = value) },
    },
  });
  runInContext(script, context);
  return applied;
}

describe("theme-init.js (runs before first paint)", () => {
  it("reads exactly what storage.ts writes, without the JSON quotes", () => {
    for (const theme of ["light", "dark", "system"]) {
      const data = new Map<string, string>();
      createStorage(() => ({
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => void data.set(key, value),
        removeItem: (key) => void data.delete(key),
      })).write(STORAGE_KEYS.theme, theme);
      expect(themeAfterInit(() => data.get(STORAGE_KEYS.theme) ?? null)).toBe(theme);
    }
  });

  it("falls back to system for missing, corrupt or unknown values", () => {
    expect(themeAfterInit(() => null)).toBe("system");
    expect(themeAfterInit(() => "{broken")).toBe("system");
    expect(themeAfterInit(() => JSON.stringify("purple"))).toBe("system");
    expect(
      themeAfterInit(() => {
        throw new Error("blocked");
      }),
    ).toBe("system");
  });
});
