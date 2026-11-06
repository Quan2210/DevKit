import { describe, expect, it } from "vitest";
import { t, translate } from "./index";
import { vi } from "./locales/vi";

describe("i18n", () => {
  it("translates keys and fills placeholders", () => {
    expect(t("app.name")).toBe("KunKit");
    expect(t("nav.noResults", { query: "xyz" })).toBe("Không có công cụ nào khớp “xyz”.");
  });

  it("works outside React and leaves unknown placeholders as written", () => {
    expect(translate("vi", "nav.noResults", {})).toContain("{query}");
  });

  it("defines a non-empty string for every key", () => {
    for (const [key, value] of Object.entries(vi)) {
      expect(typeof value, key).toBe("string");
      expect(value.trim().length, key).toBeGreaterThan(0);
    }
  });
});
