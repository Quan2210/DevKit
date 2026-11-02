import { describe, expect, it } from "vitest";
import { joinAssetUrl, joinUrl } from "./url-core";

describe("joinUrl", () => {
  it("builds the root URL with and without a base path", () => {
    expect(joinUrl("https://x.dev", "/", "/")).toBe("https://x.dev/");
    expect(joinUrl("https://quan2210.github.io", "/DevKit/", "/")).toBe(
      "https://quan2210.github.io/DevKit/",
    );
  });

  it("never repeats the base path or doubles slashes (F-2)", () => {
    expect(joinUrl("https://quan2210.github.io", "/DevKit/", "/tools/json-formatter")).toBe(
      "https://quan2210.github.io/DevKit/tools/json-formatter/",
    );
    expect(joinUrl("https://x.dev/", "//DevKit//", "//tools//")).not.toContain("//DevKit//");
    expect(joinUrl("https://x.dev/", "/", "tools/a/")).toBe("https://x.dev/tools/a/");
  });

  it("accepts a base without slashes and an origin with a trailing slash", () => {
    expect(joinUrl("https://x.dev/", "DevKit", "a")).toBe("https://x.dev/DevKit/a/");
  });
});

describe("joinAssetUrl", () => {
  it("never ends with a slash, so it points at a file", () => {
    expect(joinAssetUrl("https://quan2210.github.io", "/DevKit/", "og-default.png")).toBe(
      "https://quan2210.github.io/DevKit/og-default.png",
    );
    expect(joinAssetUrl("https://x.dev/", "/", "/og.png")).toBe("https://x.dev/og.png");
  });
});
