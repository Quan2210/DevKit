/**
 * Custom colours for the app frame (docs/design/appearance-spec.md). One base colour becomes a colour
 * for each region of the frame, separately for the light and the dark theme, and nothing is ever
 * returned that would put text or controls below WCAG AA on its region.
 *
 * Pure functions only (no DOM, no storage): the result is a flat map of CSS custom properties that
 * `appearance-store.ts` and `public/theme-init.js` set on <html>, and `tokens.css` reads.
 */
import { clampChroma, converter, formatHex, interpolate, parse } from "culori";
import { contrastRatio } from "../features/color-tools/shared/color-core/contrast";
import type { Color } from "../features/color-tools/shared/color-core/types";

export type NavStyle = "tint" | "solid";
export type RegionId = "page" | "nav" | "panel" | "status";

export interface Appearance {
  /** `#rrggbb`, or null for the default look. */
  base: string | null;
  regions: Record<RegionId, boolean>;
  navStyle: NavStyle;
}

export const DEFAULT_APPEARANCE: Appearance = {
  base: null,
  regions: { page: true, nav: true, panel: true, status: true },
  navStyle: "tint",
};

export const PRESETS: ReadonlyArray<{ id: string; hex: string }> = [
  { id: "teal", hex: "#0d9488" },
  { id: "blue", hex: "#2563eb" },
  { id: "violet", hex: "#7c3aed" },
  { id: "pink", hex: "#db2777" },
  { id: "orange", hex: "#ea580c" },
  { id: "green", hex: "#16a34a" },
  { id: "slate", hex: "#64748b" },
];

/** `ok`: used as asked; `adjusted`: a region was toned down to pass AA; `rejected`: a region fell back to the default. */
export type AppearanceStatus = "ok" | "adjusted" | "rejected";

export interface Resolved {
  /** CSS custom properties for <html>, e.g. `--ap-page-l`. Values are `#rrggbb`. */
  vars: Record<string, string>;
  /** Attributes for <html> that switch each region's colours on, e.g. `data-ap-page`. */
  attrs: string[];
  status: AppearanceStatus;
}

/** The attributes a resolved appearance may set; `tokens.css` has a rule for each. */
export const ATTRS = [
  "data-ap-page",
  "data-ap-nav",
  "data-ap-topnav",
  "data-ap-nav-solid",
  "data-ap-panel-header",
  "data-ap-status",
] as const;

type ThemeName = "light" | "dark";

/** The theme tokens the checks run against; kept equal to `tokens.css` by a test. */
const THEMES: Record<
  ThemeName,
  {
    bg: string;
    surface: string;
    text: string;
    textMuted: string;
    borderStrong: string;
    primary: string;
  }
> = {
  light: {
    bg: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    textMuted: "#5b6b82",
    borderStrong: "#8391a7",
    primary: "#4f46e5",
  },
  dark: {
    bg: "#0b1120",
    surface: "#111827",
    text: "#f8fafc",
    textMuted: "#94a3b8",
    borderStrong: "#64748b",
    primary: "#818cf8",
  },
};

/**
 * The sidebar and the top nav are one switch ("nav") but two colours: the sidebar is the stronger
 * one, the top nav sits between it and the page, so the three read as separate blocks.
 */
type TintId = RegionId | "topnav";

/** Share of the base colour mixed into each region, per theme (spec §5). */
const SHARE: Record<ThemeName, Record<TintId, number>> = {
  light: { page: 0.06, nav: 0.22, topnav: 0.1, panel: 0.24, status: 0.12 },
  dark: { page: 0.08, nav: 0.22, topnav: 0.12, panel: 0.22, status: 0.14 },
};

const SOLID_LIGHTNESS: Record<ThemeName, number> = { light: 0.3, dark: 0.24 };

const STEPS = 12;
const TEXT_RATIO = 4.5;
const UI_RATIO = 3;

const toOklch = converter("oklch");

export const HEX = /^#[0-9a-f]{6}$/i;

/** `#abc` and `#aabbcc`, with or without the `#`; lower-case `#rrggbb`, or null. */
export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(raw)) return null;
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw;
  return `#${full.toLowerCase()}`;
}

function toColor(hex: string): Color {
  const parsed = parse(hex);
  const rgb = converter("rgb")(parsed!);
  return { r: rgb.r * 255, g: rgb.g * 255, b: rgb.b * 255, a: 1 };
}

const ratio = (a: string, b: string) => contrastRatio(toColor(a), toColor(b));

function mix(from: string, to: string, share: number): string {
  return formatHex(interpolate([from, to], "oklab")(share))!;
}

/** Moves `hex` away from the background (darker in light, lighter in dark) until it passes `needed`. */
function strengthen(hex: string, background: string, theme: ThemeName, needed: number): string {
  const target = theme === "light" ? "#000000" : "#ffffff";
  for (let step = 0; step <= 20; step += 1) {
    const candidate = step === 0 ? hex : mix(hex, target, step * 0.05);
    if (ratio(candidate, background) >= needed) return candidate;
  }
  return target;
}

interface Tinted {
  /** The region colour, or null when even the plain text would not read on it. */
  background: string | null;
  /** The theme's muted text, control border and accent, strengthened so they pass on this region. */
  muted: string;
  borderStrong: string;
  primary: string;
  /** A visible dividing line, darker (light) or lighter (dark) than the region. */
  border: string;
}

/**
 * The region colour: the base mixed into the theme surface. The mix is kept as designed; what is
 * adjusted is what sits on it (muted text, control borders, accent), which only ever gets stronger.
 */
function tint(base: string, theme: ThemeName, region: TintId): Tinted {
  const t = THEMES[theme];
  const ground = region === "page" ? t.bg : t.surface;
  for (let step = 0; step <= STEPS; step += 1) {
    const background = mix(ground, base, SHARE[theme][region] * 0.85 ** step);
    if (ratio(t.text, background) < TEXT_RATIO) continue;
    return {
      background,
      muted: strengthen(t.textMuted, background, theme, TEXT_RATIO),
      borderStrong: strengthen(t.borderStrong, background, theme, UI_RATIO),
      primary: strengthen(t.primary, background, theme, UI_RATIO),
      border: mix(
        background,
        theme === "light" ? "#000000" : "#ffffff",
        theme === "light" ? 0.14 : 0.18,
      ),
    };
  }
  return {
    background: null,
    muted: t.textMuted,
    borderStrong: t.borderStrong,
    primary: t.primary,
    border: t.borderStrong,
  };
}

export interface SolidScope {
  surface: string;
  "surface-muted": string;
  text: string;
  "text-muted": string;
  border: string;
  "border-strong": string;
  primary: string;
  "on-primary": string;
}

/** The palette inside a dark region, built from its own background. */
function solidScope(surface: string, primary: string): SolidScope {
  const text = "#f8fafc";
  return {
    surface,
    "surface-muted": mix(surface, "#ffffff", 0.1),
    text,
    "text-muted": mix(text, surface, 0.25),
    border: mix(surface, "#ffffff", 0.25),
    "border-strong": mix(surface, "#ffffff", 0.55),
    primary,
    "on-primary": "#0b1120",
  };
}

function scopeReadable(scope: SolidScope): boolean {
  return (
    ratio(scope.text, scope.surface) >= TEXT_RATIO &&
    ratio(scope["text-muted"], scope.surface) >= TEXT_RATIO &&
    ratio(scope.text, scope["surface-muted"]) >= TEXT_RATIO &&
    ratio(scope["text-muted"], scope["surface-muted"]) >= TEXT_RATIO &&
    ratio(scope["border-strong"], scope.surface) >= UI_RATIO &&
    ratio(scope.primary, scope.surface) >= UI_RATIO &&
    ratio(scope["on-primary"], scope.primary) >= TEXT_RATIO
  );
}

interface Solid {
  /** Sidebar and top nav; the top nav is a step lighter so the two do not merge. */
  scopes: { nav: SolidScope; topnav: SolidScope } | null;
  adjusted: boolean;
}

function solidNav(base: string, theme: ThemeName): Solid {
  const { h = 0, c = 0 } = toOklch(parse(base)!);
  const hue = Number.isFinite(h) ? h : 0;
  const primary = formatHex(
    clampChroma({ mode: "oklch", l: 0.86, c: Math.min(c, 0.12), h: hue }, "oklch"),
  )!;
  for (let step = 0; step <= STEPS; step += 1) {
    const lightness = Math.max(SOLID_LIGHTNESS[theme] - 0.02 * step, 0.08);
    const surface = formatHex(
      clampChroma({ mode: "oklch", l: lightness, c: Math.min(c, 0.14), h: hue }, "oklch"),
    )!;
    const nav = solidScope(surface, primary);
    const topnav = solidScope(mix(surface, "#ffffff", 0.09), primary);
    if (scopeReadable(nav) && scopeReadable(topnav)) {
      return { scopes: { nav, topnav }, adjusted: step > 0 };
    }
  }
  return { scopes: null, adjusted: true };
}

const SUFFIX: Record<ThemeName, string> = { light: "l", dark: "d" };

/** Every property name a resolved appearance may set; used to clear stale ones and to validate storage. */
export const VAR_NAME = /^--ap-[a-z-]+-[ld]$/;

export function resolveAppearance(appearance: Appearance): Resolved | null {
  const base = appearance.base && normalizeHex(appearance.base);
  if (!base) return null;
  const vars: Record<string, string> = {};
  const attrs = new Set<string>();
  let adjusted = false;
  let rejected = false;

  for (const theme of ["light", "dark"] as const) {
    const s = SUFFIX[theme];
    const place = (flag: RegionId, region: TintId, name: string) => {
      if (!appearance.regions[flag]) return;
      const result = tint(base, theme, region);
      if (!result.background) {
        rejected = true;
        return;
      }
      attrs.add(`data-ap-${name}`);
      vars[`--ap-${name}-${s}`] = result.background;
      vars[`--ap-${name}-muted-${s}`] = result.muted;
      vars[`--ap-${name}-border-strong-${s}`] = result.borderStrong;
      vars[`--ap-${name}-primary-${s}`] = result.primary;
      vars[`--ap-${name}-border-${s}`] = result.border;
    };
    place("page", "page", "page");
    place("panel", "panel", "panel-header");
    place("status", "status", "status");

    if (appearance.regions.nav) {
      if (appearance.navStyle === "solid") {
        const result = solidNav(base, theme);
        if (result.adjusted) adjusted = true;
        if (result.scopes) {
          attrs.add("data-ap-nav-solid");
          for (const [region, scope] of Object.entries(result.scopes)) {
            vars[`--ap-${region}-${s}`] = scope.surface;
            for (const [key, value] of Object.entries(scope)) {
              vars[`--ap-${region}-${key}-${s}`] = value;
            }
          }
        } else {
          rejected = true;
        }
      } else {
        place("nav", "nav", "nav");
        place("nav", "topnav", "topnav");
      }
    }
  }
  return {
    vars,
    attrs: ATTRS.filter((name) => attrs.has(name)),
    status: rejected ? "rejected" : adjusted ? "adjusted" : "ok",
  };
}

/** What is saved: the choice plus its resolved properties, so `theme-init.js` only has to assign them. */
export interface StoredAppearance extends Appearance {
  v: 1;
  vars: Record<string, string>;
  attrs: string[];
}

export function toStored(appearance: Appearance, resolved: Resolved): StoredAppearance {
  return { v: 1, ...appearance, vars: resolved.vars, attrs: resolved.attrs };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Validates untrusted storage; anything unexpected (including a property name) means "no appearance". */
export function parseStored(raw: unknown): StoredAppearance | undefined {
  if (!isRecord(raw) || raw.v !== 1) return undefined;
  const { base, regions, navStyle, vars, attrs } = raw;
  if (typeof base !== "string" || !HEX.test(base)) return undefined;
  if (navStyle !== "tint" && navStyle !== "solid") return undefined;
  if (!isRecord(regions) || !isRecord(vars) || !Array.isArray(attrs)) return undefined;
  const known: ReadonlyArray<unknown> = ATTRS;
  if (!attrs.every((name) => known.includes(name))) return undefined;
  const parsedRegions = {} as Record<RegionId, boolean>;
  for (const id of ["page", "nav", "panel", "status"] as const) {
    if (typeof regions[id] !== "boolean") return undefined;
    parsedRegions[id] = regions[id];
  }
  const parsedVars: Record<string, string> = {};
  for (const [name, value] of Object.entries(vars)) {
    if (!VAR_NAME.test(name) || typeof value !== "string" || !HEX.test(value)) return undefined;
    parsedVars[name] = value;
  }
  return {
    v: 1,
    base: base.toLowerCase(),
    regions: parsedRegions,
    navStyle,
    vars: parsedVars,
    attrs: attrs as string[],
  };
}
