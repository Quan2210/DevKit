import { describe, expect, it } from "vitest";
import {
  HARMONY_MODES,
  HARMONY_RANGE,
  checkContrast,
  contrastRatio,
  formatRatio,
  generateHarmony,
  gradientToCss,
  opaque,
  parseColor,
  rgbToHsl,
  suggestForeground,
  toCssVariables,
  toHex,
  toHex8,
  toHslString,
  toRgbString,
  type Color,
  type Gradient,
} from "./index";

const c = (input: string): Color => {
  const r = parseColor(input);
  if (!r.ok) throw new Error(`unparseable ${input}`);
  return r.value;
};

describe("QA parse: accepted forms (AC color.1, FR 3.6)", () => {
  const good: Array<[string, [number, number, number, number]]> = [
    ["#fff", [255, 255, 255, 1]],
    ["fff", [255, 255, 255, 1]],
    ["#0008", [0, 0, 0, 136 / 255]],
    ["#000000", [0, 0, 0, 1]],
    ["#00000000", [0, 0, 0, 0]],
    ["#000000FF", [0, 0, 0, 1]],
    ["rgb(0,0,0)", [0, 0, 0, 1]],
    ["rgb(255, 255, 255)", [255, 255, 255, 1]],
    ["rgb(0 0 0)", [0, 0, 0, 1]],
    ["rgb(0 0 0 / 0.5)", [0, 0, 0, 0.5]],
    ["rgb(0 0 0 / 50%)", [0, 0, 0, 0.5]],
    ["rgba(0,0,0,0)", [0, 0, 0, 0]],
    ["rgba(0,0,0,1)", [0, 0, 0, 1]],
    ["rgba(0,0,0,.5)", [0, 0, 0, 0.5]],
    ["rgb(100%, 0%, 50%)", [255, 0, 127.5, 1]],
    ["rgb(12.5, 0, 0)", [12.5, 0, 0, 1]],
    ["RGB(1,2,3)", [1, 2, 3, 1]],
    ["  rgb( 1 , 2 , 3 )  ", [1, 2, 3, 1]],
  ];
  it.each(good)("%s", (input, [r, g, b, a]) => {
    const v = c(input);
    expect(v.r).toBeCloseTo(r, 6);
    expect(v.g).toBeCloseTo(g, 6);
    expect(v.b).toBeCloseTo(b, 6);
    expect(v.a).toBeCloseTo(a, 6);
  });

  it("hsl forms", () => {
    expect(toHex(c("hsl(0, 100%, 50%)"))).toBe("#FF0000");
    expect(toHex(c("hsl(120 100% 25%)"))).toBe("#008000");
    expect(toHex(c("hsla(240, 100%, 50%, 0.5)"))).toBe("#0000FF80");
    expect(toHex(c("hsl(360, 100%, 50%)"))).toBe("#FF0000");
    expect(toHex(c("hsl(-120, 100%, 50%)"))).toBe("#0000FF");
    expect(toHex(c("hsl(120deg 100% 50% / 1)"))).toBe("#00FF00");
  });
});

describe("QA parse: rejected, never clamped (AC color.1)", () => {
  const bad = [
    "",
    "   ",
    "#",
    "#12",
    "#12345",
    "#1234567",
    "#123456789",
    "#ggg",
    "rgb(256,0,0)",
    "rgb(-1,0,0)",
    "rgb(0,0,-0.1)",
    "rgb(101%,0,0)",
    "rgb(0,0)",
    "rgb(0,0,0,0,0)",
    "rgb(0 0 0 0.5)",
    "rgb(0,0,0 / 0.5)",
    "rgb(0,0,0,)",
    "rgb(,0,0)",
    "rgba(0,0,0,1.01)",
    "rgba(0,0,0,-0.01)",
    "rgba(0,0,0,101%)",
    "rgba(0,0,0,2)",
    "rgb(0,0,0",
    "rgb 0 0 0",
    "rgb(a,b,c)",
    "rgb(1e2,0,0)",
    "hsl(0, 101%, 50%)",
    "hsl(0, 50%, -1%)",
    "hsl(0, 50, 50)",
    "hsl(0, 50%, 50%, 2)",
    "hsl(abc, 50%, 50%)",
    "red",
    "rgb(0,0,0) extra",
    "rgb(rgb(0,0,0),0,0)",
  ];
  it.each(bad)("%j", (input) => {
    expect(parseColor(input).ok).toBe(false);
  });
});

describe("QA conversions consistent (AC color.1/2)", () => {
  it("hex -> hsl -> hex round trip for a grid of colors within rounding", () => {
    for (let r = 0; r < 256; r += 15)
      for (let g = 0; g < 256; g += 17)
        for (let b = 0; b < 256; b += 19) {
          const color = opaque(r, g, b);
          const back = c(toHslString(color));
          // hsl string rounds to whole degrees/percent: tolerance a few units
          expect(Math.abs(back.r - r)).toBeLessThanOrEqual(8);
          expect(Math.abs(back.g - g)).toBeLessThanOrEqual(8);
          expect(Math.abs(back.b - b)).toBeLessThanOrEqual(8);
          // exact hex / rgb round trip
          expect(toHex(c(toHex(color)))).toBe(toHex(color));
          expect(toHex(c(toRgbString(color)))).toBe(toHex(color));
        }
  });
  it("alpha preserved across formats", () => {
    for (const a of [0, 0.25, 0.5, 0.8, 1]) {
      const color = { ...opaque(10, 20, 30), a };
      expect(c(toRgbString(color)).a).toBeCloseTo(a, 2);
      expect(c(toHslString(color)).a).toBeCloseTo(a, 2);
      expect(c(toHex8(color)).a).toBeCloseTo(a, 2);
      expect(c(toHex(color)).a).toBeCloseTo(a, 2);
    }
  });
  it("known references", () => {
    expect(toHslString(c("#FF0000"))).toBe("hsl(0, 100%, 50%)");
    expect(toHslString(c("#808080"))).toBe("hsl(0, 0%, 50%)");
    expect(toHslString(c("#FFFFFF"))).toBe("hsl(0, 0%, 100%)");
    expect(toHslString(c("#000"))).toBe("hsl(0, 0%, 0%)");
    expect(toRgbString(c("#00000000"))).toBe("rgba(0, 0, 0, 0)");
    expect(rgbToHsl(c("#00FF00")).h).toBeCloseTo(120, 6);
    expect(Math.round(rgbToHsl(c("#FFFFFE")).h) % 360).toBeLessThan(361);
  });
  it("hue never prints 360", () => {
    expect(toHslString(c("#FF0001"))).toMatch(/^hsl\((0|359),/);
    expect(toHslString(c("#FF0001"))).not.toContain("360");
  });
});

describe("QA contrast (AC 3.8)", () => {
  const ratio = (a: string, b: string) => contrastRatio(c(a), c(b));
  it("WCAG references", () => {
    expect(ratio("#000", "#FFF")).toBeCloseTo(21, 10);
    expect(ratio("#FFF", "#000")).toBeCloseTo(21, 10);
    expect(ratio("#FFF", "#FFF")).toBe(1);
    expect(ratio("#123456", "#123456")).toBe(1);
    expect(ratio("#767676", "#FFF")).toBeCloseTo(4.5422, 3);
    expect(ratio("#777777", "#FFF")).toBeCloseTo(4.4778, 3);
    expect(ratio("#0000FF", "#FFF")).toBeCloseTo(8.5924, 3);
    expect(ratio("#FF0000", "#FFF")).toBeCloseTo(3.9985, 3);
    expect(ratio("#808080", "#FFF")).toBeCloseTo(3.9495, 3);
  });
  it("display truncates and thresholds use the raw value", () => {
    expect(formatRatio(4.4999)).toBe("4.49");
    expect(formatRatio(4.5)).toBe("4.50");
    expect(formatRatio(21)).toBe("21.00");
    expect(formatRatio(1)).toBe("1.00");
    expect(formatRatio(6.999999)).toBe("6.99");
    // find a grey whose ratio on white is in [4.499, 4.5)
    let lo = 0x76;
    let hi = 0x77;
    let found: ReturnType<typeof checkContrast> | null = null;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      const r = checkContrast(opaque(mid, mid, mid), opaque(255, 255, 255));
      if (r.ratio >= 4.5) lo = mid;
      else hi = mid;
      if (r.ratio < 4.5 && r.ratio > 4.4999) found = r;
    }
    expect(found).not.toBeNull();
    expect(found!.display).toBe("4.49");
    expect(found!.passes.aaNormal).toBe(false);
  });
  it("threshold flags AA/AAA normal and large", () => {
    const at = (r: number) => {
      // craft by searching grey on white
      let lo = 0;
      let hi = 255;
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        const x = contrastRatio(opaque(mid, mid, mid), opaque(255, 255, 255));
        if (x > r) lo = mid;
        else hi = mid;
      }
      return checkContrast(opaque(hi, hi, hi), opaque(255, 255, 255));
    };
    const r3 = at(3.05);
    expect(r3.passes).toEqual({
      aaNormal: false,
      aaLarge: true,
      aaaNormal: false,
      aaaLarge: false,
    });
    const r4 = at(4.6);
    expect(r4.passes).toEqual({ aaNormal: true, aaLarge: true, aaaNormal: false, aaaLarge: true });
    const r7 = at(7.05);
    expect(r7.passes).toEqual({ aaNormal: true, aaLarge: true, aaaNormal: true, aaaLarge: true });
    const r2 = at(2.9);
    expect(r2.passes).toEqual({
      aaNormal: false,
      aaLarge: false,
      aaaNormal: false,
      aaaLarge: false,
    });
  });
  it("alpha compositing on floats (SD-15)", () => {
    const r = checkContrast(c("rgba(0,0,0,0.5)"), c("#FFFFFF"));
    expect(r.ratio).toBeCloseTo(3.977, 3);
    expect(r.display).toBe("3.97");
    expect(r.foreground.r).toBeCloseTo(127.5, 9);
    expect(r.hasAlpha).toBe(true);
  });
  it("translucent background is blended on the assumed background, then fg on that", () => {
    const fg = c("#000000");
    const bg = c("rgba(255,255,255,0.5)");
    const onWhite = checkContrast(fg, bg, opaque(255, 255, 255));
    expect(onWhite.background.r).toBeCloseTo(255, 9);
    expect(onWhite.ratio).toBeCloseTo(21, 6);
    const onBlack = checkContrast(fg, bg, opaque(0, 0, 0));
    expect(onBlack.background.r).toBeCloseTo(127.5, 9);
    expect(onBlack.ratio).toBeCloseTo(
      contrastRatio(opaque(127.5, 127.5, 127.5), opaque(0, 0, 0)) as number,
      9,
    );
    // fully transparent bg == assumed
    const t = checkContrast(fg, c("#FFFFFF00"), opaque(0, 0, 255));
    expect(toHex(t.background)).toBe("#0000FF");
    // fully transparent fg == invisible text, ratio 1
    expect(checkContrast(c("#FF000000"), c("#FFFFFF")).ratio).toBeCloseTo(1, 9);
  });
  it("near-equal luminance does not blow up", () => {
    const r = checkContrast(c("#FFFFFF"), c("#FEFEFE"));
    expect(r.ratio).toBeGreaterThanOrEqual(1);
    expect(r.ratio).toBeLessThan(1.01);
    expect(r.display).toBe("1.00");
    expect(Object.values(r.passes).every((p) => !p)).toBe(true);
  });
  it("suggested colour's displayed hex really meets the target (grid)", () => {
    const samples = [
      "#FFFFFF",
      "#000000",
      "#777777",
      "#FF0000",
      "#00FF00",
      "#0000FF",
      "#FFFF00",
      "#123456",
      "#C0FFEE",
      "#ABCDEF",
      "#888888",
      "#BADA55",
      "#EC4899",
    ];
    let checked = 0;
    for (const fgHex of samples)
      for (const bgHex of samples) {
        for (const target of [4.5, 7]) {
          const s = suggestForeground(c(fgHex), c(bgHex), target);
          if (!s) continue;
          const shown = c(toHex(s));
          expect(contrastRatio(shown, c(bgHex))).toBeGreaterThanOrEqual(target);
          checked++;
        }
      }
    expect(checked).toBeGreaterThan(100);
  });
  // BUG-1: known defect. Saturated fg at OKLCH L=1/0 is gamut-clipped, so the endpoint
  // is not white/black and the search gives up although plain black/white reaches the target.
  it("suggestion exists whenever black or white reaches the target (BUG-1)", () => {
    const samples = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#EC4899"];
    const bgs = ["#777777", "#0000FF", "#FF0000"];
    for (const f of samples)
      for (const b of bgs)
        for (const target of [4.5, 7]) {
          const best = Math.max(contrastRatio(c("#000"), c(b)), contrastRatio(c("#FFF"), c(b)));
          if (best >= target)
            expect(suggestForeground(c(f), c(b), target), `${f} on ${b} @${target}`).not.toBeNull();
        }
  });
  it("suggestion is nearest-ish: does not jump to black/white when a mild change suffices", () => {
    const s = suggestForeground(c("#777777"), c("#FFFFFF"), 4.5)!;
    expect(toHex(s)).not.toBe("#000000");
    expect(contrastRatio(s, c("#FFFFFF"))).toBeLessThan(5.2);
  });
});

describe("QA harmony (plan 6.3, F-6)", () => {
  const base = c("#3366CC"); // h=220
  const h0 = rgbToHsl(base).h;
  const hueOf = (x: Color) => rgbToHsl(x).h;
  const diff = (a: number, b: number) => {
    const d = Math.abs(a - b) % 360;
    return Math.min(d, 360 - d);
  };
  for (const mode of HARMONY_MODES) {
    for (const count of [2, 3, 4, 5, 10]) {
      it(`${mode} x${count}: exactly clamped count, base once, valid colors`, () => {
        const out = generateHarmony(base, mode, count);
        const want = Math.min(Math.max(count, HARMONY_RANGE[mode].min), HARMONY_RANGE[mode].max);
        expect(out).toHaveLength(want);
        expect(out.filter((e) => e.isBase)).toHaveLength(1);
        for (const e of out) {
          for (const k of ["r", "g", "b"] as const) {
            expect(e.color[k]).toBeGreaterThanOrEqual(-1e-9);
            expect(e.color[k]).toBeLessThanOrEqual(255 + 1e-9);
          }
          expect(toHex(e.color)).toMatch(/^#[0-9A-F]{6}$/);
        }
      });
    }
  }
  it("out-of-range requests clamp", () => {
    expect(generateHarmony(base, "tetradic", 1)).toHaveLength(4);
    expect(generateHarmony(base, "triadic", 2)).toHaveLength(3);
    expect(generateHarmony(base, "analogous", 99)).toHaveLength(10);
    expect(generateHarmony(base, "analogous", 0)).toHaveLength(2);
    expect(generateHarmony(base, "analogous", -5)).toHaveLength(2);
    expect(generateHarmony(base, "analogous", 4.6)).toHaveLength(5);
  });
  it("analogous: base first, then +30, -30, +60, -60 ...", () => {
    const out = generateHarmony(base, "analogous", 5);
    expect(out[0]!.isBase).toBe(true);
    const offs = [30, -30, 60, -60];
    offs.forEach((o, i) =>
      expect(diff(hueOf(out[i + 1]!.color), (h0 + o + 360) % 360)).toBeLessThan(1.5),
    );
    const ten = generateHarmony(base, "analogous", 10);
    expect(diff(hueOf(ten[9]!.color), (h0 + 150) % 360)).toBeLessThan(1.5); // i=9 -> rank5, +150
  });
  it("complementary/triadic/tetradic base hues", () => {
    const comp = generateHarmony(base, "complementary", 2);
    expect(diff(hueOf(comp[1]!.color), (h0 + 180) % 360)).toBeLessThan(1.5);
    const tri = generateHarmony(base, "triadic", 3);
    expect(diff(hueOf(tri[1]!.color), (h0 + 120) % 360)).toBeLessThan(1.5);
    expect(diff(hueOf(tri[2]!.color), (h0 + 240) % 360)).toBeLessThan(1.5);
    const tet = generateHarmony(base, "tetradic", 4);
    [90, 180, 270].forEach((o, i) =>
      expect(diff(hueOf(tet[i + 1]!.color), (h0 + o) % 360)).toBeLessThan(1.5),
    );
  });
  it("count above hue count adds lightness variants of the base hues (+-12%)", () => {
    const out = generateHarmony(base, "complementary", 6);
    const l0 = rgbToHsl(base).l;
    // extras at indexes 2..5: variants cycle 0,180 hues with +12, -12(alternating) ...
    const extra = out.slice(2).map((e) => rgbToHsl(e.color));
    expect(extra[0]!.l).toBeCloseTo(l0 + 12, 0);
    expect(extra[2]!.l).toBeCloseTo(l0 - 12, 0);
    expect(diff(extra[0]!.h, h0)).toBeLessThan(1.5);
    expect(diff(extra[1]!.h, (h0 + 180) % 360)).toBeLessThan(1.5);
  });
  it("monochromatic: same hue/sat, lightness spans 20..90 evenly, base at nearest slot", () => {
    const out = generateHarmony(base, "monochromatic", 5);
    const ls = out.map((e) => rgbToHsl(e.color).l);
    const nonBase = out.map((e, i) => [e, i] as const).filter(([e]) => !e.isBase);
    const expected = [20, 37.5, 55, 72.5, 90];
    nonBase.forEach(([e, i]) => expect(rgbToHsl(e.color).l).toBeCloseTo(expected[i]!, 0));
    expect(ls).toHaveLength(5);
    const baseIdx = out.findIndex((e) => e.isBase);
    // base L is ~ 50 -> nearest slot 55 (idx 2)
    expect(baseIdx).toBe(2);
    const two = generateHarmony(base, "monochromatic", 2);
    expect(rgbToHsl(two.find((e) => !e.isBase)!.color).l).toBeGreaterThan(0);
  });
  it("greys / black / white / pure-hue bases stay valid", () => {
    for (const hex of ["#000", "#FFF", "#808080", "#FF0000", "#00000000"])
      for (const mode of HARMONY_MODES)
        for (const n of [2, 5, 10]) {
          const out = generateHarmony(c(hex), mode, n);
          for (const e of out) {
            expect(Number.isFinite(e.color.r + e.color.g + e.color.b)).toBe(true);
          }
        }
  });
  it("alpha of base carried to derived colours", () => {
    const out = generateHarmony(c("#3366CC80"), "triadic", 5);
    out.forEach((e) => expect(e.color.a).toBeCloseTo(128 / 255, 6));
  });
});

describe("QA css variables", () => {
  const cols = [c("#112233"), c("#44556680")];
  const valid = /^:root \{\n( {2}--[a-z][a-z0-9-]*-\d+: #[0-9A-F]{6}([0-9A-F]{2})?;\n?)+\}$/;
  it("names valid for hostile prefixes", () => {
    for (const p of [
      "",
      "  ",
      "Brand Colors",
      "1abc",
      "--x",
      "-",
      "a;b{}",
      "<script>",
      "ÁÀ",
      "a/*b*/",
      "x}:root{--y:",
      "ABC_def",
      "\n",
    ]) {
      const out = toCssVariables(cols, p);
      expect(out, p).toMatch(valid);
      expect(out.match(/\{/g)).toHaveLength(1);
      expect(out.match(/\}/g)).toHaveLength(1);
    }
    expect(toCssVariables(cols, "Brand Colors")).toContain("--brand-colors-1: #112233;");
    expect(toCssVariables(cols, "")).toContain("--color-1:");
    expect(toCssVariables(cols, "x")).toContain("--x-2: #44556680;");
  });
});

describe("QA gradient css", () => {
  const stops = (...p: Array<[string, number]>) =>
    p.map(([h, position], i) => ({ id: `s${i}`, color: c(h), position }));
  it("linear forms and angle normalisation", () => {
    const g = (angle: number): Gradient => ({
      type: "linear",
      angle,
      stops: stops(["#000", 0], ["#fff", 100]),
    });
    expect(gradientToCss(g(0))).toBe("linear-gradient(0deg, #000000 0%, #FFFFFF 100%)");
    expect(gradientToCss(g(360))).toContain("linear-gradient(0deg");
    expect(gradientToCss(g(450))).toContain("(90deg");
    expect(gradientToCss(g(-90))).toContain("(270deg");
    expect(gradientToCss(g(12.345))).toContain("(12.35deg");
    expect(gradientToCss(g(-0.0001))).toMatch(/\(0deg|\(360deg/);
  });
  it("radial forms", () => {
    const css = gradientToCss({
      type: "radial",
      shape: "ellipse",
      position: "top left",
      stops: stops(["#f00", 0], ["#00ff8080", 100]),
    });
    expect(css).toBe("radial-gradient(ellipse at top left, #FF0000 0%, #00FF8080 100%)");
  });
  it("sorts by position, stable for ties, and keeps alpha hex", () => {
    const css = gradientToCss({
      type: "linear",
      angle: 90,
      stops: stops(["#00000080", 50], ["#111", 0], ["#222", 50], ["#333", 100]),
    });
    expect(css).toBe(
      "linear-gradient(90deg, #111111 0%, #00000080 50%, #222222 50%, #333333 100%)",
    );
  });
  it("accepted by the CSS engine in jsdom (cssstyle)", () => {
    const el = document.createElement("div");
    const variants: Gradient[] = [
      { type: "linear", angle: 135, stops: stops(["#4F46E5", 0], ["#EC489980", 100]) },
      {
        type: "radial",
        shape: "circle",
        position: "bottom right",
        stops: stops(["#4F46E5", 0], ["#EC4899", 55.5], ["#000", 100]),
      },
    ];
    for (const g of variants) {
      el.style.backgroundImage = "";
      el.style.backgroundImage = gradientToCss(g);
      // jsdom's cssstyle may be lax; at minimum the value must be retained
      expect(el.style.backgroundImage).not.toBe("");
    }
    el.style.backgroundImage = "";
    el.style.backgroundImage = "linear-gradient(garbage";
    expect(el.style.backgroundImage).toBe("");
  });
});
