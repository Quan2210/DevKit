// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { declaredEncoding, formatXml, isUtf8, validateXml, type XmlParser } from "./xml";

const real: XmlParser = new DOMParser() as unknown as XmlParser;
const XHTML = "http://www.w3.org/1999/xhtml";
const MOZ = "http://www.mozilla.org/newlayout/xml/parsererror.xml";

/** A parser that answers like Chrome/Safari (error inside the root) or Firefox (error is the root). */
function fakeBrowser(shape: "chrome" | "firefox"): XmlParser {
  return {
    parseFromString(text, type) {
      if (!text.includes("BROKEN")) return real.parseFromString(text, type);
      if (shape === "firefox") {
        const doc = document.implementation.createDocument(MOZ, "parsererror", null);
        doc.documentElement.textContent =
          "XML Parsing Error: mismatched tag. Expected: </b>.\nLocation: file:///x\nLine Number 4, Column 9:<a>";
        return doc;
      }
      const doc = real.parseFromString("<a/>", type);
      const error = doc.createElementNS(XHTML, "parsererror");
      const heading = doc.createElementNS(XHTML, "h3");
      heading.textContent = "This page contains the following errors:";
      const message = doc.createElementNS(XHTML, "div");
      message.textContent =
        "error on line 3 at column 7: Opening and ending tag mismatch: a line 1 and b";
      error.append(heading, message);
      doc.documentElement.insertBefore(error, doc.documentElement.firstChild);
      return doc;
    },
  };
}

describe("parsererror shapes of real browsers", () => {
  it("Chrome/Safari: error inside the root is reported with a clean detail and position", () => {
    const result = validateXml("<a>BROKEN</b>", fakeBrowser("chrome"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.position).toEqual({ line: 3, column: 7 });
    expect(result.error.detail).toMatch(/^error on line 3 at column 7/);
    expect(result.error.detail).not.toContain("This page contains");
  });

  it("Firefox: error as the document root is reported with its position", () => {
    const result = validateXml("<a>BROKEN</b>", fakeBrowser("firefox"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.position).toEqual({ line: 4, column: 9 });
  });

  it("format and minify refuse (no output) on those errors", () => {
    for (const shape of ["chrome", "firefox"] as const) {
      expect(formatXml("<a>BROKEN</b>", 2, fakeBrowser(shape)).ok).toBe(false);
    }
  });

  it("an XHTML parsererror element that is the user's own data deeper in the document is valid", () => {
    const text =
      '<html xmlns="http://www.w3.org/1999/xhtml"><body><parsererror>x</parsererror></body></html>';
    expect(validateXml(text, real).ok).toBe(true);
  });
});

describe("xml:space detection", () => {
  it("ignores text that looks like xml:space inside an attribute value", () => {
    const result = formatXml(`<a><b t=' xml:space="preserve"'><c/><d/></b></a>`, 2, real);
    expect(result).toEqual({
      ok: true,
      value: `<a>\n  <b t=' xml:space="preserve"'>\n    <c/>\n    <d/>\n  </b>\n</a>`,
    });
  });

  it("uses the real attribute when a lookalike value comes first", () => {
    const text = `<a><b t=' xml:space="default"' xml:space="preserve"> <c/> </b></a>`;
    const result = formatXml(text, 2, real);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toContain(`xml:space="preserve"> <c/> </b>`);
  });

  it("keeps a whole preserve subtree verbatim, even with a nested default", () => {
    const text = '<a xml:space="preserve"><b xml:space="default"><c/></b></a>';
    expect(formatXml(text, 2, real)).toEqual({ ok: true, value: text });
  });
});

describe("encoding declaration", () => {
  it("reads the declared encoding", () => {
    expect(declaredEncoding('<?xml version="1.0" encoding="ISO-8859-1"?><a/>')).toBe("ISO-8859-1");
    expect(declaredEncoding("<?xml version='1.0' encoding='utf-8'?><a/>")).toBe("utf-8");
    expect(declaredEncoding('<?xml version="1.0"?><a/>')).toBeUndefined();
    expect(declaredEncoding("<a encoding='x'/>")).toBeUndefined();
  });

  it("treats utf-8 spellings as UTF-8 only", () => {
    expect(["UTF-8", "utf8", "Utf-8"].every(isUtf8)).toBe(true);
    expect(["UTF-16", "ISO-8859-1"].some(isUtf8)).toBe(false);
  });
});
