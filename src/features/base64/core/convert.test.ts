import { describe, expect, it } from "vitest";
import { convert } from "./convert";

describe("convert", () => {
  it("encodes and decodes Unicode both ways, standard and URL-safe", () => {
    for (const urlSafe of [false, true]) {
      const encoded = convert("Xin chào 😀", "encode", urlSafe);
      expect(encoded.ok).toBe(true);
      if (encoded.ok) {
        const decoded = convert(encoded.value, "decode", urlSafe);
        expect(decoded.ok && decoded.value).toBe("Xin chào 😀");
      }
    }
  });

  it("treats empty input as empty output in both modes (no error)", () => {
    expect(convert("", "encode", false)).toEqual({ ok: true, value: "" });
    expect(convert("", "decode", false)).toEqual({ ok: true, value: "" });
  });

  it("URL-safe output has no padding or +/ characters", () => {
    const encoded = convert("ûÿ?>", "encode", true);
    expect(encoded.ok && /^[A-Za-z0-9_-]+$/.test(encoded.value)).toBe(true);
  });

  it("reports invalid Base64 without throwing and with a position", () => {
    const result = convert("Zm9v!", "decode", false);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.position).toEqual({ line: 1, column: 5 });
  });
});
