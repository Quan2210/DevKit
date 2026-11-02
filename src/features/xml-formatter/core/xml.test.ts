// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { extractXmlPosition, formatXml, minifyXml, validateXml, type XmlParser } from "./xml";

const parser: XmlParser = new DOMParser() as unknown as XmlParser;

const corpus: Record<string, string> = {
  simple: "<a><b>1</b><c>2</c></a>",
  nested: "<a><b><c><d>deep</d></c></b></a>",
  attributesAndNamespaces:
    '<r xmlns:x="urn:x" xmlns="urn:d"><x:item id="1" x:kind=\'k\' z="3" a="1">t</x:item></r>',
  comment: "<a><!-- note --><b/></a>",
  cdata: "<a><![CDATA[1 < 2 && <b>]]></a>",
  unicodeAndEntities: '<a t="é &amp; &#x1F600;">Tiếng Việt &lt;ok&gt; &#169; 日本語</a>',
  emptyElements: "<a><b/><c></c><d> </d></a>",
  processingInstruction: '<?xml version="1.0" encoding="UTF-8"?><?pi data?><a><?inner x?></a>',
  mixedContent: "<p>Hello <b>big</b> world <i>!</i></p>",
  preserve: '<a><pre xml:space="preserve">  <b>x</b>\n   <c/>  </pre><d><e/></d></a>',
  doctype: '<!DOCTYPE a [<!ENTITY e "v"><!ELEMENT a ANY>]><a>&e;<b/></a>',
  indentedAlready: "<a>\n  <b>1</b>\n  <c>\n    <d/>\n  </c>\n</a>",
};

describe("validateXml", () => {
  it("accepts well-formed XML", () => {
    expect(validateXml("<a/>", parser).ok).toBe(true);
  });

  it("rejects empty input without a parse error", () => {
    const result = validateXml("  \n", parser);
    expect(result.ok).toBe(false);
  });

  it.each([
    ["mismatched tag", "<a><b></a></b>"],
    ["unclosed", "<a><b>"],
    ["two roots", "<a/><b/>"],
    ["bad entity", "<a>&nope;</a>"],
    ["unquoted attribute", "<a x=1/>"],
    ["text only", "just text"],
  ])("reports %s as invalid and never as success", (_name, text) => {
    const result = validateXml(text, parser);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("validation");
  });

  it("gives a position for a mismatched tag when the engine reports one", () => {
    const result = validateXml("<a>\n<b></a>", parser);
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.position) {
      expect(result.error.position.line).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("extractXmlPosition", () => {
  it.each([
    ["error on line 3 at column 7: Opening and ending tag mismatch", { line: 3, column: 7 }],
    [
      "XML Parsing Error: mismatched tag.\nLocation: x\nLine Number 4, Column 9:",
      { line: 4, column: 9 },
    ],
    ["2:5: unexpected close tag.", { line: 2, column: 5 }],
    ["error at line 8", { line: 8, column: 1 }],
  ])("reads %j", (message, expected) => {
    expect(extractXmlPosition(message)).toEqual(expected);
  });

  it("returns undefined when there is no position", () => {
    expect(extractXmlPosition("something broke")).toBeUndefined();
  });
});

describe("formatXml", () => {
  it("indents element-only content with 2 and 4 spaces", () => {
    const two = formatXml("<a><b><c>1</c></b></a>", 2, parser);
    expect(two).toEqual({ ok: true, value: "<a>\n  <b>\n    <c>1</c>\n  </b>\n</a>" });
    const four = formatXml("<a><b>1</b></a>", 4, parser);
    expect(four).toEqual({ ok: true, value: "<a>\n    <b>1</b>\n</a>" });
  });

  it("keeps the declaration, comments, processing instructions and CDATA on their own lines", () => {
    const result = formatXml(corpus.processingInstruction!, 2, parser);
    expect(result).toEqual({
      ok: true,
      value: '<?xml version="1.0" encoding="UTF-8"?>\n<?pi data?>\n<a>\n  <?inner x?>\n</a>',
    });
  });

  it("does not touch mixed content", () => {
    const result = formatXml("<r><p>Hello <b>big</b> world <i>!</i></p><q><x/></q></r>", 2, parser);
    expect(result).toEqual({
      ok: true,
      value: "<r>\n  <p>Hello <b>big</b> world <i>!</i></p>\n  <q>\n    <x/>\n  </q>\n</r>",
    });
  });

  it("keeps whitespace under xml:space=preserve exactly", () => {
    const result = formatXml(corpus.preserve!, 2, parser);
    expect(result.ok && result.value).toContain(
      '<pre xml:space="preserve">  <b>x</b>\n   <c/>  </pre>',
    );
  });

  it("lets xml:space=default turn indentation off again inside preserve", () => {
    const text = '<a xml:space="preserve"><b xml:space="default"><c/></b></a>';
    const result = formatXml(text, 2, parser);
    expect(result.ok).toBe(true);
  });

  it("keeps quotes, attribute order, entities and Unicode exactly", () => {
    const result = formatXml(corpus.attributesAndNamespaces!, 2, parser);
    expect(result.ok && result.value).toContain(`<x:item id="1" x:kind='k' z="3" a="1">t</x:item>`);
    const entities = formatXml(corpus.unicodeAndEntities!, 2, parser);
    expect(entities).toEqual({ ok: true, value: corpus.unicodeAndEntities });
  });

  it("keeps a whitespace-only value", () => {
    const result = formatXml("<a><d> </d></a>", 2, parser);
    expect(result.ok && result.value).toContain("<d> </d>");
  });

  it("keeps the DOCTYPE with its internal subset", () => {
    const result = formatXml(corpus.doctype!, 2, parser);
    expect(result.ok && result.value).toContain('<!DOCTYPE a [<!ENTITY e "v"><!ELEMENT a ANY>]>');
  });

  it("is idempotent", () => {
    for (const [name, text] of Object.entries(corpus)) {
      const once = formatXml(text, 2, parser);
      expect(once.ok, name).toBe(true);
      if (!once.ok) continue;
      expect(formatXml(once.value, 2, parser), name).toEqual(once);
    }
  });

  it("returns the validation error for broken XML and no output", () => {
    const result = formatXml("<a><b></a>", 2, parser);
    expect(result.ok).toBe(false);
  });
});

describe("minifyXml", () => {
  it("removes indentation between elements only", () => {
    expect(minifyXml(corpus.indentedAlready!, parser)).toEqual({
      ok: true,
      value: "<a><b>1</b><c><d/></c></a>",
    });
  });

  it("keeps text, mixed content, CDATA and preserved whitespace", () => {
    const text =
      '<a>\n  <p>Hello <b>x</b> !</p>\n  <![CDATA[ keep ]]>\n  <s xml:space="preserve"> a \n b </s>\n</a>';
    const result = minifyXml(text, parser);
    expect(result.ok && result.value).toContain("<p>Hello <b>x</b> !</p>");
    expect(result.ok && result.value).toContain(" a \n b ");
    expect(result.ok && result.value).toContain("<![CDATA[ keep ]]>");
  });

  it("puts the declaration straight before the root", () => {
    const result = minifyXml('<?xml version="1.0"?>\n<a>\n  <b/>\n</a>\n', parser);
    expect(result).toEqual({ ok: true, value: '<?xml version="1.0"?><a><b/></a>' });
  });
});

describe("round trip over the PRD corpus", () => {
  for (const [name, text] of Object.entries(corpus)) {
    it(`${name}: format and minify parse again and keep the content`, () => {
      for (const result of [
        formatXml(text, 2, parser),
        formatXml(text, 4, parser),
        minifyXml(text, parser),
      ]) {
        expect(result.ok).toBe(true);
        if (result.ok) expect(validateXml(result.value, parser).ok).toBe(true);
      }
    });
  }

  it("text content is identical after format", () => {
    const textOf = (xml: string) =>
      parser.parseFromString(xml, "application/xml").documentElement.textContent;
    for (const [name, text] of Object.entries(corpus)) {
      const result = formatXml(text, 2, parser);
      if (!result.ok) throw new Error(name);
      const before = textOf(text)!.replace(/\s+/g, "");
      const after = textOf(result.value)!.replace(/\s+/g, "");
      expect(after, name).toBe(before);
    }
  });
});
