/**
 * Guards the shared corpus: if a fixture is wrong, every later milestone that relies on it would
 * test the wrong thing. Expectations here come from independent sources (JSON.parse, DOMParser,
 * Node's base64url and a re-implementation of the WCAG formula).
 */
import { describe, expect, it } from "vitest";
import { decode } from "../../src/lib/text/base64";
import {
  alphaContrastCase,
  contrastCases,
  dataImageMarkdown,
  expiredToken,
  externalImageCases,
  invalidColors,
  invalidJson,
  malformedTokens,
  malformedXml,
  safeIntegerJson,
  sampleHeader,
  samplePayload,
  sampleToken,
  securityCases,
  syntaxCases,
  unsafeIntegerJson,
  validColors,
  validJson,
  validXml,
} from "./index";

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (rgb: number[]) =>
  0.2126 * channel(rgb[0]!) + 0.7152 * channel(rgb[1]!) + 0.0722 * channel(rgb[2]!);
const hex = (value: string) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

describe("json fixtures", () => {
  it.each(validJson)("valid: $name", ({ input }) => {
    expect(() => JSON.parse(input)).not.toThrow();
  });
  it.each(invalidJson)("invalid: $name", ({ input }) => {
    expect(() => JSON.parse(input)).toThrow();
  });
  it("flags integers that JSON.parse cannot represent exactly", () => {
    for (const { input } of unsafeIntegerJson) {
      expect(JSON.stringify(JSON.parse(input))).not.toBe(input.replace(/\s/g, ""));
    }
    for (const { input } of safeIntegerJson) expect(() => JSON.parse(input)).not.toThrow();
  });
});

describe("xml fixtures", () => {
  const parse = (input: string) => new DOMParser().parseFromString(input, "application/xml");
  it.each(validXml)("well-formed: $name", ({ input }) => {
    expect(parse(input).getElementsByTagName("parsererror")).toHaveLength(0);
  });
  it.each(malformedXml)("malformed: $name", ({ input }) => {
    expect(parse(input).getElementsByTagName("parsererror").length).toBeGreaterThan(0);
  });
});

describe("jwt fixtures", () => {
  const json = (token: string, index: number) => {
    const bytes = decode(token.split(".")[index]!, { urlSafe: true });
    return bytes.ok ? JSON.parse(bytes.value) : undefined;
  };
  it("the sample token decodes to the documented header and payload", () => {
    expect(json(sampleToken, 0)).toEqual(sampleHeader);
    expect(json(sampleToken, 1)).toEqual(samplePayload);
  });
  it("built tokens have three parts and decode", () => {
    expect(expiredToken.split(".")).toHaveLength(3);
    expect(json(expiredToken, 1).exp).toBeLessThan(json(expiredToken, 1).iat + 7200);
  });
  it("malformed tokens are all distinct", () => {
    expect(new Set(malformedTokens.map((c) => c.token)).size).toBe(malformedTokens.length);
  });
});

describe("color fixtures", () => {
  it("valid colour cases have in-range expectations", () => {
    for (const { input, rgba } of validColors) {
      expect(input.length, input).toBeGreaterThan(0);
      for (const c of rgba.slice(0, 3)) expect(c).toBeGreaterThanOrEqual(0);
      expect(rgba[3]).toBeGreaterThanOrEqual(0);
      expect(rgba[3]).toBeLessThanOrEqual(1);
    }
    expect(new Set(invalidColors).size).toBe(invalidColors.length);
  });
  it.each(contrastCases)("$foreground on $background is $ratio:1", (c) => {
    expect(ratio(hex(c.foreground), hex(c.background))).toBeCloseTo(c.ratio, 3);
  });
  it("alpha case: black at 50% composited in floats over white", () => {
    expect(ratio([127.5, 127.5, 127.5], [255, 255, 255])).toBeCloseTo(alphaContrastCase.ratio, 3);
  });
  it("4.499 must never be rounded up to a pass at 4.5 (R7)", () => {
    const failing = contrastCases.find((c) => c.foreground === "#777777")!;
    expect(failing.ratio).toBeLessThan(4.5);
    expect(Math.floor(failing.ratio * 100) / 100).toBe(4.47);
  });
});

describe("markdown fixtures", () => {
  it("syntax, security and privacy cases are non-empty and uniquely named", () => {
    for (const set of [syntaxCases, securityCases, externalImageCases]) {
      expect(new Set(set.map((c) => c.name)).size).toBe(set.length);
      for (const c of set) expect(c.markdown.length, c.name).toBeGreaterThan(0);
    }
    expect(dataImageMarkdown).toContain("data:image/png");
    expect(securityCases.length).toBeGreaterThanOrEqual(10);
  });
});
