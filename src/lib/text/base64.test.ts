import { describe, expect, it } from "vitest";
import { decode, decodeToBytes, encode, encodeBytes, fromUrlSafe, toUrlSafe } from "./base64";

const okValue = <T>(result: { ok: boolean; value?: T }): T | undefined =>
  result.ok ? result.value : undefined;

describe("encode", () => {
  it.each([
    ["", ""],
    ["f", "Zg=="],
    ["fo", "Zm8="],
    ["foo", "Zm9v"],
    ["foob", "Zm9vYg=="],
    ["fooba", "Zm9vYmE="],
    ["foobar", "Zm9vYmFy"],
  ])("matches the RFC 4648 vector for %j", (input, expected) => {
    expect(encode(input)).toBe(expected);
  });

  it("encodes Unicode as UTF-8", () => {
    expect(encode("Xin chào")).toBe(Buffer.from("Xin chào", "utf8").toString("base64"));
    expect(encode("😀")).toBe("8J+YgA==");
  });

  it("produces the URL-safe alphabet without padding", () => {
    const bytes = Uint8Array.of(0xfb, 0xff);
    expect(encodeBytes(bytes)).toBe("+/8=");
    expect(encodeBytes(bytes, { urlSafe: true })).toBe("-_8");
  });

  it("handles large input without overflowing the call stack", () => {
    const bytes = new Uint8Array(3_000_000).fill(0xab);
    expect(encodeBytes(bytes)).toBe(Buffer.from(bytes).toString("base64"));
  });
});

describe("decode", () => {
  it.each([
    "",
    "f",
    "fo",
    "foo",
    "foob",
    "fooba",
    "foobar",
    "Xin chào",
    "😀 日本語 ñ",
    "﻿BOM first",
  ])("round-trips %j exactly", (text) => {
    expect(okValue(decode(encode(text)))).toBe(text);
    expect(okValue(decode(encode(text, { urlSafe: true }), { urlSafe: true }))).toBe(text);
  });

  it("agrees with Node on pseudo-random bytes in both alphabets", () => {
    let seed = 12345; // fixed seed so a failure is reproducible
    const next = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed >>> 24;
    };
    for (let i = 0; i < 200; i += 1) {
      const bytes = Uint8Array.from({ length: i % 61 }, next);
      const standard = Buffer.from(bytes).toString("base64");
      expect(encodeBytes(bytes)).toBe(standard);
      expect(encodeBytes(bytes, { urlSafe: true })).toBe(Buffer.from(bytes).toString("base64url"));
      expect(okValue(decodeToBytes(standard))).toEqual(bytes);
      expect(okValue(decodeToBytes(toUrlSafe(standard), { urlSafe: true }))).toEqual(bytes);
    }
  });

  it("accepts missing padding and ignores whitespace and line breaks", () => {
    expect(okValue(decode("Zg"))).toBe("f");
    expect(okValue(decode("Zm9v\nYmFy"))).toBe("foobar");
    expect(okValue(decode("  Zm 9v  \r\n YmFy "))).toBe("foobar");
  });

  it("rejects an unknown character and reports its line and column", () => {
    const result = decode("Zm9v\nYm@y");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("validation");
      expect(result.error.position).toEqual({ line: 2, column: 3 });
      expect(result.error.message).toContain("“@”");
    }
  });

  it("treats the URL-safe characters as invalid in standard mode and the reverse", () => {
    expect(decode("-_8").ok).toBe(false);
    expect(decode("+/8=", { urlSafe: true }).ok).toBe(false);
    expect(okValue(decodeToBytes("-_8", { urlSafe: true }))).toEqual(Uint8Array.of(0xfb, 0xff));
  });

  it.each([
    ["Zm9vY", "base64.invalidLength"],
    ["Z=g=", "invalidPadding"],
    ["Zg===", "invalidPadding"],
    ["Zm9v=", "invalidPadding"],
    ["=", "invalidPadding"],
    ["Zg==Zg==", "invalidPadding"],
  ])("rejects malformed structure %j", (input) => {
    expect(decode(input).ok).toBe(false);
  });

  it("rejects bytes that are not UTF-8 instead of returning replacement characters", () => {
    const result = decode("/w==");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("UTF-8");
    expect(okValue(decodeToBytes("/w=="))).toEqual(Uint8Array.of(0xff));
  });
});

describe("URL-safe helpers (shared with the JWT decoder)", () => {
  it("convert in both directions and restore padding", () => {
    expect(toUrlSafe("+/8=")).toBe("-_8");
    expect(fromUrlSafe("-_8")).toBe("+/8=");
    expect(fromUrlSafe("Zm9v")).toBe("Zm9v");
  });
});
