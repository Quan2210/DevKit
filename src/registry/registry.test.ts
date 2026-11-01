import { describe, expect, it } from "vitest";
import { vi } from "../i18n/locales/vi";
import { buildSitemapXml } from "../lib/sitemap";
import { joinUrl } from "../lib/url-core";
import { GROUPS, TOOLS, listedTools, routableTools, toolPath, type ToolMeta } from "./tools.meta";

const fakeTool: ToolMeta = {
  id: "fake",
  slug: "fake-tool",
  group: "data",
  titleKey: "tool.json.title",
  descriptionKey: "tool.json.description",
  keywords: [],
  priority: "P0",
  status: "ready",
  icon: "braces",
  routeFile: "routes/tools/fake.tsx",
};

describe("tool registry", () => {
  it("has unique ids and slugs, and a catalog entry for every key", () => {
    expect(new Set(TOOLS.map((tool) => tool.id)).size).toBe(TOOLS.length);
    expect(new Set(TOOLS.map((tool) => tool.slug)).size).toBe(TOOLS.length);
    for (const tool of TOOLS) {
      expect(vi[tool.titleKey], tool.id).toBeTypeOf("string");
      expect(vi[tool.descriptionKey], tool.id).toBeTypeOf("string");
      expect(
        GROUPS.some((group) => group.id === tool.group),
        tool.id,
      ).toBe(true);
    }
  });

  it("lists only ready, non-hidden tools in navigation (planned and hidden are excluded)", () => {
    const tools: ToolMeta[] = [
      fakeTool,
      { ...fakeTool, id: "planned", slug: "planned", status: "planned" },
      { ...fakeTool, id: "hidden", slug: "hidden", hidden: true },
    ];
    expect(routableTools(tools).map((t) => t.id)).toEqual(["fake", "hidden"]);
    expect(listedTools(tools).map((t) => t.id)).toEqual(["fake"]);
  });

  it("derives route paths and sitemap entries from one entry (SD-6)", () => {
    expect(toolPath(fakeTool)).toBe("/tools/fake-tool");
    const urls = ["/", ...listedTools([fakeTool]).map(toolPath)].map((p) =>
      joinUrl("https://x.dev", "/DevKit/", p),
    );
    expect(buildSitemapXml(urls)).toContain("<loc>https://x.dev/DevKit/tools/fake-tool/</loc>");
  });
});
