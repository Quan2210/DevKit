import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "../features/color-tools/shared/color-core/contrast";
import { parseColor } from "../features/color-tools/shared/color-core/parse";
import {
  DEFAULT_APPEARANCE,
  PRESETS,
  VAR_NAME,
  normalizeHex,
  parseStored,
  resolveAppearance,
  toStored,
  type Appearance,
} from "./appearance";

const css = readFileSync(resolve(process.cwd(), "src/styles/tokens.css"), "utf8");
const block = (from: string, to: string) => css.slice(css.indexOf(from), css.indexOf(to));
const token = (source: string, name: string) =>
  new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, "i").exec(source)![1]!.toLowerCase();
const lightTokens = block("@theme", ":root {");
const darkTokens = block(':root[data-theme="dark"]', "@media");
const tokensOf = { l: lightTokens, d: darkTokens } as const;

const color = (hex: string) => {
  const parsed = parseColor(hex);
  if (!parsed.ok) throw new Error(hex);
  return parsed.value;
};
const ratio = (a: string, b: string) => contrastRatio(color(a), color(b));

const asked = (base: string, extra: Partial<Appearance> = {}): Appearance => ({
  ...DEFAULT_APPEARANCE,
  base,
  ...extra,
});

describe("normalizeHex", () => {
  it("accepts 3 and 6 digit colours, with or without #", () => {
    expect(normalizeHex("#0D9488")).toBe("#0d9488");
    expect(normalizeHex("0d9488")).toBe("#0d9488");
    expect(normalizeHex("#abc")).toBe("#aabbcc");
    expect(normalizeHex("  #FFF ")).toBe("#ffffff");
  });

  it("rejects anything else", () => {
    for (const bad of ["", "#12", "#12345", "#1234567", "#ggg", "red", "#00000080", "rgb(0,0,0)"]) {
      expect(normalizeHex(bad), bad).toBeNull();
    }
  });
});

describe("theme tokens used for the checks", () => {
  it("match tokens.css", async () => {
    // The checks hard-code the token values; this keeps them from drifting apart.
    const source = readFileSync(resolve(process.cwd(), "src/lib/appearance.ts"), "utf8");
    for (const [suffix, tokens] of Object.entries(tokensOf)) {
      const theme = suffix === "l" ? "light" : "dark";
      const section = source.slice(source.indexOf(`  ${theme}: {`));
      for (const [key, name] of [
        ["bg", "bg"],
        ["surface", "surface"],
        ["text", "text"],
        ["textMuted", "text-muted"],
        ["borderStrong", "border-strong"],
        ["primary", "primary"],
      ] as const) {
        expect(section, `${theme} ${key}`).toContain(`${key}: "${token(tokens, name)}"`);
      }
    }
  });
});

describe("resolveAppearance", () => {
  it("returns nothing for the default look", () => {
    expect(resolveAppearance(DEFAULT_APPEARANCE)).toBeNull();
    expect(resolveAppearance(asked("not a colour"))).toBeNull();
  });

  it("sets a colour and the attribute for each region and theme", () => {
    const resolved = resolveAppearance(asked("#0d9488"))!;
    for (const name of ["page", "nav", "topnav", "panel-header", "status"]) {
      for (const suffix of ["l", "d"]) {
        expect(resolved.vars[`--ap-${name}-${suffix}`], name).toMatch(/^#[0-9a-f]{6}$/);
        for (const extra of ["muted", "border-strong", "primary"]) {
          expect(resolved.vars[`--ap-${name}-${extra}-${suffix}`], `${name} ${extra}`).toMatch(
            /^#[0-9a-f]{6}$/,
          );
        }
      }
    }
    expect(resolved.attrs).toEqual([
      "data-ap-page",
      "data-ap-nav",
      "data-ap-topnav",
      "data-ap-panel-header",
      "data-ap-status",
    ]);
  });

  it("only sets the regions that are switched on", () => {
    const resolved = resolveAppearance(
      asked("#0d9488", {
        regions: { page: false, nav: true, panel: false, status: false },
      }),
    )!;
    expect(resolved.attrs).toEqual(["data-ap-nav", "data-ap-topnav"]);
    expect(
      Object.keys(resolved.vars).every(
        (name) => name.startsWith("--ap-nav-") || name.startsWith("--ap-topnav-"),
      ),
    ).toBe(true);
  });

  it("uses only valid property names and hex values", () => {
    for (const navStyle of ["tint", "solid"] as const) {
      const resolved = resolveAppearance(asked("#7c3aed", { navStyle }))!;
      for (const [name, value] of Object.entries(resolved.vars)) {
        expect(name).toMatch(VAR_NAME);
        expect(value).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  const colours = [
    ...PRESETS.map((preset) => preset.hex),
    "#ffff00", // bright yellow
    "#00ff00", // neon green
    "#ff00ff",
    "#ffffff",
    "#000000",
    "#808080",
    "#ff0000",
    "#0000ff",
  ];

  describe.each(colours)("base %s", (base) => {
    for (const navStyle of ["tint", "solid"] as const) {
      it(`keeps text and controls at WCAG AA on every region (${navStyle} nav)`, () => {
        const resolved = resolveAppearance(asked(base, { navStyle }))!;
        for (const [suffix, tokens] of Object.entries(tokensOf)) {
          const text = token(tokens, "text");
          for (const region of ["page", "panel-header", "status", "nav", "topnav"]) {
            const background = resolved.vars[`--ap-${region}-${suffix}`];
            if (!background) continue;
            const get = (key: string) => resolved.vars[`--ap-${region}-${key}-${suffix}`]!;
            if ((region === "nav" || region === "topnav") && navStyle === "solid") {
              expect(ratio(get("text"), background), "solid text").toBeGreaterThanOrEqual(4.5);
              expect(ratio(get("text-muted"), background), "solid muted").toBeGreaterThanOrEqual(
                4.5,
              );
              expect(
                ratio(get("text"), get("surface-muted")),
                "solid active item",
              ).toBeGreaterThanOrEqual(4.5);
              expect(
                ratio(get("border-strong"), background),
                "solid border",
              ).toBeGreaterThanOrEqual(3);
              expect(ratio(get("primary"), background), "solid primary").toBeGreaterThanOrEqual(3);
              expect(
                ratio(get("on-primary"), get("primary")),
                "solid on-primary",
              ).toBeGreaterThanOrEqual(4.5);
              continue;
            }
            const label = `${region} ${suffix}`;
            expect(ratio(text, background), `${label} text`).toBeGreaterThanOrEqual(4.5);
            expect(ratio(get("muted"), background), `${label} muted`).toBeGreaterThanOrEqual(4.5);
            expect(
              ratio(get("border-strong"), background),
              `${label} border`,
            ).toBeGreaterThanOrEqual(3);
            expect(ratio(get("primary"), background), `${label} primary`).toBeGreaterThanOrEqual(3);
          }
        }
      });
    }
  });

  it("keeps the tint as designed and only strengthens what sits on it", () => {
    const resolved = resolveAppearance(asked("#0d9488"))!;
    // 24% of the base in the light panel header: clearly tinted, not washed out.
    expect(ratio(resolved.vars["--ap-panel-header-l"]!, "#ffffff")).toBeGreaterThan(1.1);
    // The muted text gets darker than the default token to keep 4.5:1 on that tint.
    expect(ratio(resolved.vars["--ap-panel-header-muted-l"]!, "#ffffff")).toBeGreaterThan(
      ratio(token(lightTokens, "text-muted"), "#ffffff"),
    );
    expect(resolved.status).toBe("ok");
  });

  describe("sidebar, top nav and page stay distinct blocks", () => {
    const set = [...PRESETS.map((preset) => preset.hex), "#ffff00", "#000000", "#808080"];
    for (const base of set) {
      for (const navStyle of ["tint", "solid"] as const) {
        it(`${base} (${navStyle})`, () => {
          const resolved = resolveAppearance(asked(base, { navStyle }))!;
          for (const suffix of ["l", "d"]) {
            const nav = resolved.vars[`--ap-nav-${suffix}`]!;
            const top = resolved.vars[`--ap-topnav-${suffix}`]!;
            const page = resolved.vars[`--ap-page-${suffix}`]!;
            expect(nav, `nav ${suffix}`).not.toBe(top);
            expect(top, `topnav ${suffix}`).not.toBe(page);
            // the dividing line has to be visible against the block it closes
            for (const region of ["nav", "topnav"]) {
              const own = resolved.vars[`--ap-${region}-${suffix}`]!;
              const line = resolved.vars[`--ap-${region}-border-${suffix}`]!;
              expect(ratio(line, own), `${region} ${suffix} divider`).toBeGreaterThan(1.25);
            }
          }
        });
      }
    }
  });

  it("makes the solid navigation dark with light text", () => {
    const resolved = resolveAppearance(asked("#0d9488", { navStyle: "solid" }))!;
    expect(resolved.attrs).toContain("data-ap-nav-solid");
    expect(resolved.vars["--ap-nav-text-l"]).toBe("#f8fafc");
    expect(ratio(resolved.vars["--ap-nav-l"]!, "#ffffff")).toBeGreaterThan(7);
  });
});

describe("stored appearance", () => {
  const stored = () => {
    const appearance = asked("#0d9488");
    return toStored(appearance, resolveAppearance(appearance)!);
  };

  it("round-trips through JSON", () => {
    const value = stored();
    expect(parseStored(JSON.parse(JSON.stringify(value)))).toEqual(value);
  });

  it("rejects anything unexpected", () => {
    const base = stored();
    const bad: unknown[] = [
      null,
      "x",
      [],
      { ...base, v: 2 },
      { ...base, base: "red" },
      { ...base, navStyle: "loud" },
      { ...base, regions: { page: true } },
      { ...base, vars: { "--evil": "#000000" } },
      { ...base, vars: { "--ap-page-l": "url(javascript:alert(1))" } },
      { ...base, vars: { "--ap-page-l": "red" } },
      { ...base, attrs: ["onclick"] },
      { ...base, attrs: "data-ap-page" },
    ];
    for (const value of bad) expect(parseStored(value), JSON.stringify(value)).toBeUndefined();
  });
});
