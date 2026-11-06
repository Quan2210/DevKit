import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ATTRS, DEFAULT_APPEARANCE, resolveAppearance, toStored } from "./appearance";
import { getStoredAppearance, resetAppearance, setAppearance } from "./appearance-store";
import { STORAGE_KEYS } from "./storage";

const root = () => document.documentElement;
const apVars = () => Array.from(root().style).filter((name) => name.startsWith("--ap-"));
const apAttrs = () => ATTRS.filter((name) => root().hasAttribute(name));
const saved = () => localStorage.getItem(STORAGE_KEYS.appearance);

beforeEach(() => {
  localStorage.clear();
  resetAppearance();
});
afterEach(() => resetAppearance());

describe("appearance store", () => {
  it("starts with the default look", () => {
    expect(getStoredAppearance()).toBeNull();
    expect(apVars()).toEqual([]);
    expect(apAttrs()).toEqual([]);
  });

  it("saves the choice and puts the colours on <html>", () => {
    setAppearance({ ...DEFAULT_APPEARANCE, base: "#0d9488" });
    expect(apAttrs()).toEqual([
      "data-ap-page",
      "data-ap-nav",
      "data-ap-panel-header",
      "data-ap-status",
    ]);
    expect(root().style.getPropertyValue("--ap-page-l")).toMatch(/^#[0-9a-f]{6}$/);
    expect(JSON.parse(saved()!)).toMatchObject({ v: 1, base: "#0d9488", navStyle: "tint" });
    expect(getStoredAppearance()?.base).toBe("#0d9488");
  });

  it("replaces the previous colours instead of piling up", () => {
    setAppearance({ ...DEFAULT_APPEARANCE, base: "#0d9488", navStyle: "solid" });
    expect(apAttrs()).toContain("data-ap-nav-solid");
    expect(root().style.getPropertyValue("--ap-nav-text-l")).toBe("#f8fafc");
    setAppearance({ ...DEFAULT_APPEARANCE, base: "#2563eb" });
    expect(apAttrs()).not.toContain("data-ap-nav-solid");
    expect(root().style.getPropertyValue("--ap-nav-text-l")).toBe("");
  });

  it("leaves out the regions that are switched off", () => {
    setAppearance({
      base: "#0d9488",
      navStyle: "tint",
      regions: { page: false, nav: true, panel: false, status: false },
    });
    expect(apAttrs()).toEqual(["data-ap-nav"]);
  });

  it("the default look clears everything, storage included", () => {
    setAppearance({ ...DEFAULT_APPEARANCE, base: "#0d9488" });
    setAppearance(DEFAULT_APPEARANCE);
    expect(saved()).toBeNull();
    expect(apVars()).toEqual([]);
    expect(apAttrs()).toEqual([]);
  });

  it("reset clears everything", () => {
    setAppearance({ ...DEFAULT_APPEARANCE, base: "#0d9488" });
    resetAppearance();
    expect(saved()).toBeNull();
    expect(apAttrs()).toEqual([]);
  });
});

/** Run public/theme-init.js against a fake page and report what it set. */
function runInit(getItem: (key: string) => string | null) {
  const props = new Map<string, string>();
  const attributes = new Set<string>();
  const context = createContext({
    localStorage: { getItem },
    document: {
      documentElement: {
        setAttribute: (name: string) => attributes.add(name),
        style: { setProperty: (name: string, value: string) => props.set(name, value) },
      },
    },
  });
  runInContext(readFileSync(resolve(process.cwd(), "public/theme-init.js"), "utf8"), context);
  return { props, attributes };
}

describe("theme-init.js applies the saved colours before first paint", () => {
  const asked = { ...DEFAULT_APPEARANCE, base: "#0d9488", navStyle: "solid" as const };
  const stored = toStored(asked, resolveAppearance(asked)!);
  const read = (value: unknown) => (key: string) =>
    key === STORAGE_KEYS.appearance ? JSON.stringify(value) : null;

  it("assigns every saved property and attribute", () => {
    const { props, attributes } = runInit(read(stored));
    expect(Object.fromEntries(props)).toEqual(stored.vars);
    expect([...attributes].filter((name) => name.startsWith("data-ap-")).sort()).toEqual(
      [...stored.attrs].sort(),
    );
  });

  it("knows every attribute the app can set", () => {
    const script = readFileSync(resolve(process.cwd(), "public/theme-init.js"), "utf8");
    for (const name of ATTRS) expect(script).toContain(`"${name}"`);
  });

  it("ignores names and values it does not recognise", () => {
    const hostile = {
      ...stored,
      vars: {
        "--ap-page-l": "#112233",
        "--evil": "#000000",
        "--ap-page-d": "url(javascript:alert(1))",
        "background-image": "#000000",
      },
      attrs: ["data-ap-page", "onclick", "data-ap-evil"],
    };
    const { props, attributes } = runInit(read(hostile));
    expect(Object.fromEntries(props)).toEqual({ "--ap-page-l": "#112233" });
    expect(attributes.has("data-ap-page")).toBe(true);
    expect(attributes.has("onclick")).toBe(false);
    expect(attributes.has("data-ap-evil")).toBe(false);
  });

  it("does nothing for missing, corrupt or blocked storage", () => {
    for (const getItem of [
      () => null,
      () => "{broken",
      () => JSON.stringify("text"),
      () => JSON.stringify({ v: 9 }),
      () => {
        throw new Error("blocked");
      },
    ]) {
      expect(runInit(getItem).props.size).toBe(0);
    }
  });
});
