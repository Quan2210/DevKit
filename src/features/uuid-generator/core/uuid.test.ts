import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_UUIDS, UUID_V4, generateUuids } from "./uuid";

afterEach(() => vi.restoreAllMocks());

describe("generateUuids", () => {
  it("returns the requested number of valid, distinct v4 UUIDs", () => {
    for (const count of [1, 5, MAX_UUIDS]) {
      const result = generateUuids(count);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(count);
        expect(result.value.every((uuid) => UUID_V4.test(uuid))).toBe(true);
        expect(new Set(result.value).size).toBe(count);
      }
    }
  });

  it.each([0, -1, 1001, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an invalid count: %s",
    (count) => {
      const result = generateUuids(count);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.message).toContain("1 đến 1000");
    },
  );

  it("falls back to getRandomValues and still sets version 4 and the RFC variant", () => {
    const crypto = { getRandomValues: ((bytes: Uint8Array) => bytes.fill(0xff)) as never };
    const result = generateUuids(1, crypto);
    expect(result.ok && result.value[0]).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
    const zero = generateUuids(1, {
      getRandomValues: ((bytes: Uint8Array) => bytes.fill(0)) as never,
    });
    expect(zero.ok && zero.value[0]).toBe("00000000-0000-4000-8000-000000000000");
  });

  it("reports an error when Web Crypto is missing instead of using Math.random", () => {
    const random = vi.spyOn(Math, "random");
    const result = generateUuids(3, {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("Web Crypto");
    expect(random).not.toHaveBeenCalled();
  });

  it("never touches Math.random on the normal path either", () => {
    const random = vi.spyOn(Math, "random");
    generateUuids(100);
    generateUuids(100, { getRandomValues: ((bytes: Uint8Array) => bytes.fill(7)) as never });
    expect(random).not.toHaveBeenCalled();
  });
});
