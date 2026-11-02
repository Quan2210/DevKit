import { describe, expect, it } from "vitest";
import {
  HARMONY_MODES,
  HARMONY_RANGE,
  checkContrast,
  composite,
  contrastRatio,
  formatRatio,
  generateHarmony,
  gradientToCss,
  hslToRgb,
  opaque,
  parseColor,
  relativeLuminance,
  rgbToHsl,
  suggestForeground,
  toCssVariables,
  toHex,
  toHex8,
  toHslString,
  toRgbString,
  type Color,
} from "./index";

const must = (text: string): Color => {
  const result = parseColor(text);
  if (!result.ok) throw new Error(`cannot parse ${text}`);
  return result.value;
};
const WHITE = opaque(255, 255, 255);
const BLACK = opaque(0, 0, 0);

describe("parseColor", () => {
  it.each([
    ["#f00", { r: 255, g: 0, b: 0, a: 1 }],
    ["#F00A", { r: 255, g: 0, b: 0, a: 170 / 255 }],
    ["4F46E5", { r: 79, g: 70, b: 229, a: 1 }],
    ["#4f46e5cc", { r: 79, g: 70, b: 229, a: 0.8 }],
    ["rgb(79, 70, 229)", { r: 79, g: 70, b: 229, a: 1 }],
    ["rgba(79,70,229,0.8)", { r: 79, g: 70, b: 229, a: 0.8 }],
    ["rgb(79 70 229 / 80%)", { r: 79, g: 70, b: 229, a: 0.8 }],
    ["rgb(100%, 0%, 0%)", { r: 255, g: 0, b: 0, a: 1 }],
    ["  RGB( 1 , 2 , 3 )  ", { r: 1, g: 2, b: 3, a: 1 }],
  ])("reads %s", (text, expected) => {
    expect(must(text)).toEqual(expected);
  });

  it("reads hsl in both syntaxes", () => {
    const red = must("hsl(0, 100%, 50%)");
    expect(red.r).toBeCloseTo(255);
    expect(red.g).toBeCloseTo(0);
    expect(must("hsla(120 100% 25% / 0.5)").a).toBe(0.5);
    expect(must("hsl(240deg, 100%, 50%)").b).toBeCloseTo(255);
  });

  it.each([
    "",
    "   ",
    "#12",
    "#12345",
    "#GGGGGG",
    "red",
    "rgb(256, 0, 0)",
    "rgb(-1, 0, 0)",
    "rgb(1, 2)",
    "rgb(1, 2, 3, 4, 5)",
    "rgb(1 2 3 / 0.5 / 0.5)",
    "rgba(0,0,0,1.5)",
    "rgba(0,0,0,-0.1)",
    "hsl(0, 101%, 50%)",
    "hsl(0, 50, 50)",
    "rgb(a, b, c)",
    "rgb(1,2,3",
    "rgb(1, 2, 3) extra",
    "rgb(1,, 3)",
  ])("rejects %j without clamping", (text) => {
    expect(parseColor(text).ok).toBe(false);
  });

  it("explains alpha and range errors differently", () => {
    const alpha = parseColor("rgba(0,0,0,2)");
    const range = parseColor("rgb(300,0,0)");
    expect(!alpha.ok && !range.ok && alpha.error.message !== range.error.message).toBe(true);
  });
});

describe("format", () => {
  it("writes HEX with alpha only when needed", () => {
    expect(toHex(must("#4f46e5"))).toBe("#4F46E5");
    expect(toHex(must("#4f46e5cc"))).toBe("#4F46E5CC");
    expect(toHex8(must("#4f46e5"))).toBe("#4F46E5FF");
  });

  it("writes rgb and hsl strings", () => {
    expect(toRgbString(must("#4f46e5"))).toBe("rgb(79, 70, 229)");
    expect(toRgbString(must("#4f46e5cc"))).toBe("rgba(79, 70, 229, 0.8)");
    expect(toHslString(must("#4f46e5"))).toBe("hsl(243, 75%, 59%)");
    expect(toHslString(must("#4f46e580"))).toBe("hsla(243, 75%, 59%, 0.5)");
  });

  it("keeps alpha at 0 and 1 and 0.5 explicit", () => {
    expect(toRgbString({ r: 0, g: 0, b: 0, a: 0 })).toBe("rgba(0, 0, 0, 0)");
    expect(toRgbString({ r: 0, g: 0, b: 0, a: 1 })).toBe("rgb(0, 0, 0)");
    expect(toRgbString({ r: 0, g: 0, b: 0, a: 0.5 })).toBe("rgba(0, 0, 0, 0.5)");
  });

  it("round trips every format within rounding", () => {
    for (const text of ["#4F46E5", "#FF8800", "#000000", "#FFFFFF", "#10B981", "#7C3AED"]) {
      const color = must(text);
      expect(toHex(must(toRgbString(color)))).toBe(text);
      const viaHsl = must(toHslString(color));
      for (const channel of ["r", "g", "b"] as const) {
        expect(Math.abs(viaHsl[channel] - color[channel])).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe("hsl conversion", () => {
  it("round trips over a grid", () => {
    for (let h = 0; h < 360; h += 30) {
      for (const s of [0, 40, 100]) {
        for (const l of [0, 25, 50, 80, 100]) {
          const back = rgbToHsl(hslToRgb({ h, s, l }));
          if (l > 0 && l < 100 && s > 0) {
            expect(back.h).toBeCloseTo(h, 5);
            expect(back.s).toBeCloseTo(s, 5);
          }
          expect(back.l).toBeCloseTo(l, 5);
        }
      }
    }
  });

  it("handles greys and the wrap-around", () => {
    expect(rgbToHsl(opaque(128, 128, 128))).toMatchObject({ h: 0, s: 0 });
    expect(hslToRgb({ h: 360, s: 100, l: 50 }).r).toBeCloseTo(255);
    expect(hslToRgb({ h: -120, s: 100, l: 50 }).b).toBeCloseTo(255);
  });
});

describe("contrast", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 10);
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 10);
    expect(contrastRatio(must("#767676"), WHITE)).toBeCloseTo(4.54, 2);
    expect(contrastRatio(must("#777777"), WHITE)).toBeCloseTo(4.48, 2);
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 10);
    expect(relativeLuminance(BLACK)).toBe(0);
  });

  it("does not round 4.499 up to a pass (SD-14)", () => {
    expect(formatRatio(4.4999)).toBe("4.49");
    expect(formatRatio(4.5)).toBe("4.50");
    expect(formatRatio(21)).toBe("21.00");
    const near = checkContrast(must("#777777"), WHITE);
    expect(near.ratio).toBeLessThan(4.5);
    expect(near.passes.aaNormal).toBe(false);
    expect(near.display).toBe("4.47");
  });

  it("evaluates each threshold from the unrounded ratio", () => {
    const result = checkContrast(must("#767676"), WHITE);
    expect(result.passes).toEqual({
      aaNormal: true,
      aaLarge: true,
      aaaNormal: false,
      aaaLarge: true,
    });
    const low = checkContrast(must("#949494"), WHITE);
    expect(low.passes).toEqual({
      aaNormal: false,
      aaLarge: true,
      aaaNormal: false,
      aaaLarge: false,
    });
  });

  it("blends a translucent foreground on floats, without 8-bit rounding (SD-15)", () => {
    const half = { r: 0, g: 0, b: 0, a: 0.5 };
    const blended = composite(half, WHITE);
    expect(blended.r).toBe(127.5);
    const result = checkContrast(half, WHITE);
    expect(result.ratio).toBeCloseTo(3.977, 3);
    expect(result.display).toBe("3.97");
    expect(result.hasAlpha).toBe(true);
  });

  it("blends a translucent background onto the assumed background first", () => {
    const glass = { r: 255, g: 255, b: 255, a: 0.5 };
    const onBlack = checkContrast(BLACK, glass, BLACK);
    expect(onBlack.background.r).toBe(127.5);
    const onWhite = checkContrast(BLACK, glass, WHITE);
    expect(onWhite.ratio).toBeCloseTo(21, 10);
    expect(onBlack.ratio).toBeLessThan(onWhite.ratio);
  });

  it("is symmetric in the ratio when swapped", () => {
    const a = must("#4f46e5");
    const b = must("#f8fafc");
    expect(checkContrast(a, b).ratio).toBeCloseTo(checkContrast(b, a).ratio, 10);
  });

  it("an opaque pair has no alpha note", () => {
    expect(checkContrast(BLACK, WHITE).hasAlpha).toBe(false);
  });
});

describe("suggestForeground", () => {
  it("returns the color itself when it already passes", () => {
    expect(suggestForeground(BLACK, WHITE, 4.5)).toEqual(BLACK);
  });

  it("finds a passing color close to the original", () => {
    const grey = must("#999999");
    const fixed = suggestForeground(grey, WHITE, 4.5);
    expect(fixed).not.toBeNull();
    expect(contrastRatio(fixed!, WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(fixed!, WHITE)).toBeLessThan(5);
  });

  it("moves toward white on a dark background", () => {
    const fixed = suggestForeground(must("#333333"), must("#111111"), 4.5);
    expect(fixed).not.toBeNull();
    expect(relativeLuminance(fixed!)).toBeGreaterThan(relativeLuminance(must("#333333")));
  });

  it("reaches AAA when possible and says null when impossible", () => {
    expect(suggestForeground(must("#999999"), WHITE, 7)).not.toBeNull();
    expect(suggestForeground(must("#777777"), must("#777777"), 21)).toBeNull();
  });
});

describe("harmony", () => {
  const base = must("#4F46E5");
  const { h } = rgbToHsl(base);
  const hueOf = (color: Color) => rgbToHsl(color).h;
  const near = (actual: number, expected: number) => {
    const diff = Math.abs(((actual - expected + 540) % 360) - 180);
    expect(diff).toBeLessThan(1.5);
  };

  it("always returns exactly `count` colors with one base, for every mode and size", () => {
    for (const mode of HARMONY_MODES) {
      for (let count = HARMONY_RANGE[mode].min; count <= HARMONY_RANGE[mode].max; count += 1) {
        const colors = generateHarmony(base, mode, count);
        expect(colors, `${mode} ${count}`).toHaveLength(count);
        expect(colors.filter((entry) => entry.isBase)).toHaveLength(1);
      }
    }
  });

  it("keeps the base first except in monochromatic", () => {
    for (const mode of HARMONY_MODES.filter((value) => value !== "monochromatic")) {
      const colors = generateHarmony(base, mode, HARMONY_RANGE[mode].min);
      expect(colors[0]!.isBase).toBe(true);
      expect(colors[0]!.color).toEqual(base);
    }
  });

  it("complementary: base and +180", () => {
    const [first, second] = generateHarmony(base, "complementary", 2);
    near(hueOf(first!.color), h);
    near(hueOf(second!.color), h + 180);
  });

  it("triadic: +120 and +240", () => {
    const colors = generateHarmony(base, "triadic", 3);
    [0, 120, 240].forEach((offset, i) => near(hueOf(colors[i]!.color), h + offset));
  });

  it("tetradic: +90, +180, +270", () => {
    const colors = generateHarmony(base, "tetradic", 4);
    [0, 90, 180, 270].forEach((offset, i) => near(hueOf(colors[i]!.color), h + offset));
  });

  it("analogous: steps of 30 degrees spread both ways", () => {
    for (const count of [2, 5, 10]) {
      const colors = generateHarmony(base, "analogous", count);
      const offsets = [0, 30, -30, 60, -60, 90, -90, 120, -120, 150];
      colors.forEach((entry, i) => near(hueOf(entry.color), h + offsets[i]!));
    }
  });

  it("monochromatic keeps hue and saturation, with lightness from 20 to 90", () => {
    const colors = generateHarmony(base, "monochromatic", 5);
    const lightness = colors.map((entry) => rgbToHsl(entry.color).l);
    const generated = colors.filter((entry) => !entry.isBase);
    generated.forEach((entry) => near(hueOf(entry.color), h));
    expect(lightness[0]).toBeCloseTo(20, 0);
    expect(lightness.at(-1)).toBeCloseTo(90, 0);
    expect([...lightness].sort((a, b) => a - b)).toEqual(lightness);
  });

  it("extra colors beyond the base hues are lightness variants of those hues", () => {
    const colors = generateHarmony(base, "complementary", 6);
    colors.slice(2).forEach((entry, i) => {
      near(hueOf(entry.color), h + (i % 2 === 0 ? 0 : 180));
    });
    expect(new Set(colors.map((entry) => toHex(entry.color))).size).toBe(6);
  });

  it("clamps the count into the allowed range", () => {
    expect(generateHarmony(base, "tetradic", 1)).toHaveLength(4);
    expect(generateHarmony(base, "triadic", 99)).toHaveLength(10);
  });

  it("keeps alpha on every color", () => {
    const translucent = { ...base, a: 0.4 };
    generateHarmony(translucent, "triadic", 5).forEach((entry) => expect(entry.color.a).toBe(0.4));
  });

  it("handles black, white and grey bases", () => {
    for (const color of [BLACK, WHITE, opaque(128, 128, 128)]) {
      for (const mode of HARMONY_MODES) {
        const colors = generateHarmony(color, mode, 5);
        expect(colors).toHaveLength(5);
        colors.forEach((entry) => expect(toHex(entry.color)).toMatch(/^#[0-9A-F]{6}$/));
      }
    }
  });
});

describe("css", () => {
  it("exports valid custom properties", () => {
    const css = toCssVariables([must("#4f46e5"), must("#10b981cc")], "My Brand!");
    expect(css).toBe(":root {\n  --my-brand-1: #4F46E5;\n  --my-brand-2: #10B981CC;\n}");
  });

  it("falls back to a safe prefix", () => {
    expect(toCssVariables([BLACK], "123")).toContain("--color-1:");
    expect(toCssVariables([BLACK], "")).toContain("--color-1:");
    expect(toCssVariables([BLACK], "ÅÄÖ")).toContain("--color-1:");
  });

  it("writes linear and radial gradients with stops in position order", () => {
    const stops = [
      { id: "b", color: must("#0000ff"), position: 100 },
      { id: "a", color: must("#ff0000"), position: 0 },
      { id: "c", color: must("#00ff0080"), position: 33.333 },
    ];
    expect(gradientToCss({ type: "linear", angle: 450, stops })).toBe(
      "linear-gradient(90deg, #FF0000 0%, #00FF0080 33.33%, #0000FF 100%)",
    );
    expect(gradientToCss({ type: "radial", shape: "circle", position: "top left", stops })).toBe(
      "radial-gradient(circle at top left, #FF0000 0%, #00FF0080 33.33%, #0000FF 100%)",
    );
  });
});

describe("suggestForeground returns a real 8-bit color that passes", () => {
  it("the displayed hex itself meets the target", () => {
    for (const hex of ["#777777", "#999999", "#AAB0BC", "#6366F1", "#F59E0B"]) {
      for (const target of [4.5, 7]) {
        const fixed = suggestForeground(must(hex), WHITE, target);
        if (!fixed) continue;
        const rounded = must(toHex(fixed));
        expect(
          contrastRatio(rounded, WHITE),
          `${hex} -> ${toHex(fixed)} @${target}`,
        ).toBeGreaterThanOrEqual(target);
      }
    }
  });
});
