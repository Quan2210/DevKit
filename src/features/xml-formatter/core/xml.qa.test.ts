// @vitest-environment jsdom
// QA adversarial suite for M5 (PRD 3.5 / 9.3). Expectations come from the requirement, not the code.
import { describe, expect, it } from "vitest";
import { formatXml, minifyXml, validateXml, type XmlParser } from "./xml";

const parser: XmlParser = new DOMParser() as unknown as XmlParser;
const fmt = (s: string, n: 2 | 4 = 2) => formatXml(s, n, parser);
const min = (s: string) => minifyXml(s, parser);

/** Text of every text/CDATA node in document order, XML-whitespace-only nodes between elements excluded. */
const significantText = (xml: string): string[] => {
  const doc = parser.parseFromString(xml, "application/xml");
  const out: string[] = [];
  const walk = (n: Node) => {
    for (const c of n.childNodes) {
      if (c.nodeType === 3 || c.nodeType === 4) {
        const v = c.nodeValue ?? "";
        if (!/^[ \t\r\n]*$/.test(v)) out.push(v);
      } else if (c.nodeType === 8) out.push(`<!--${c.nodeValue}-->`);
      else if (c.nodeType === 7)
        out.push(`<?${(c as ProcessingInstruction).target} ${c.nodeValue}?>`);
      else walk(c);
    }
  };
  walk(doc);
  return out;
};

const valid: Record<string, string> = {
  mixed: "<p>a <b>b</b> <?pi x?> c<!--k--></p>",
  piInMixed: "<p>t<?pi data?>u</p>",
  preserveNest: '<a xml:space="preserve"> <b xml:space="default"> <c/> </b> <d/> </a>',
  defaultNestInPreserveThenPreserve:
    '<a><b xml:space="preserve"> <c xml:space="default"> <d/> </c> </b></a>',
  wsValue: "<a><b>   </b><c>\n</c></a>",
  crlf: "<a>\r\n  <b>1</b>\r\n  <c>x\r\ny</c>\r\n</a>\r\n",
  bom: "﻿<a><b/></a>",
  doctype: '<!DOCTYPE a [<!ENTITY e "v>w"><!ELEMENT a ANY>]><a>&e;<b/></a>',
  attrGt: `<a t="1>2" u='say "hi"' v="it's"><b w="&gt;"/></a>`,
  cdataTricky: "<a><![CDATA[x]]]]><![CDATA[>y <b/> <!-- c --> ]]></a>",
  cdataOnly: "<a><![CDATA[  ]]></a>",
  commentDash: "<a><!-- a - b -  c --><b/></a>",
  entityGt: "<a>]]&gt;</a>",
  supp: "<a t='😀'>😀 𠀀<b>𝒳</b></a>",
  nsXmlSpace: '<r xmlns:p="urn:p"><p:x p:xml-space="preserve"> <y/> </p:x></r>',
  attrValueMentionsSpace: `<a><b t=' xml:space="preserve"'> <c/> </b></a>`,
  declaration: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<a><b/></a>',
  topLevelComments: "<!-- pre --><a/><!-- post -->",
  empty: "<a><b/><c></c><d> </d></a>",
  nsDefault: '<a xmlns="urn:d"><b xmlns=""><c/></b></a>',
};

describe("QA: valid inputs keep content, parse again, are idempotent", () => {
  for (const [name, text] of Object.entries(valid)) {
    it(name, () => {
      const f2 = fmt(text);
      const f4 = fmt(text, 4);
      const m = min(text);
      expect(f2.ok, `format2 ${JSON.stringify(f2)}`).toBe(true);
      expect(f4.ok).toBe(true);
      expect(m.ok, `minify ${JSON.stringify(m)}`).toBe(true);
      if (!f2.ok || !f4.ok || !m.ok) return;
      for (const r of [f2.value, f4.value, m.value]) expect(validateXml(r, parser).ok).toBe(true);
      expect(significantText(f2.value)).toEqual(significantText(text));
      expect(significantText(m.value)).toEqual(significantText(text));
      const again = fmt(f2.value);
      expect(again.ok && again.value).toBe(f2.value);
      const mAgain = min(m.value);
      expect(mAgain.ok && mAgain.value).toBe(m.value);
      const mf = min(f2.value);
      expect(mf.ok && mf.value, "minify(format(x)) === minify(x)").toBe(m.value);
    });
  }
});

describe("QA: exact preservation", () => {
  it("keeps attribute quotes, '>' in attributes, entities, CDATA text exactly", () => {
    const r = fmt(valid.attrGt!);
    expect(r.ok && r.value).toContain(`<a t="1>2" u='say "hi"' v="it's">`);
    expect(r.ok && r.value).toContain(`w="&gt;"`);
    const c = fmt(valid.cdataTricky!);
    expect(c.ok && c.value).toBe(valid.cdataTricky);
  });
  it("whitespace-only values and preserve subtrees are verbatim", () => {
    const r = min(valid.wsValue!);
    expect(r.ok && r.value).toBe(valid.wsValue);
    const p = fmt(valid.preserveNest!);
    expect(p.ok && p.value).toBe(valid.preserveNest);
  });
  it("preserve nested under default keeps inner whitespace", () => {
    const r = fmt(valid.defaultNestInPreserveThenPreserve!);
    expect(r.ok && r.value).toContain(
      '<b xml:space="preserve"> <c xml:space="default"> <d/> </c> </b>',
    );
  });
  it("keeps the declaration and DOCTYPE internal subset byte for byte", () => {
    const d = fmt(valid.declaration!);
    expect(
      d.ok && d.value.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<a>'),
    ).toBe(true);
    const t = fmt(valid.doctype!);
    expect(t.ok && t.value).toContain('<!DOCTYPE a [<!ENTITY e "v>w"><!ELEMENT a ANY>]>');
  });
  it("keeps a processing instruction inside mixed content in place", () => {
    const r = fmt(valid.piInMixed!);
    expect(r.ok && r.value).toBe(valid.piInMixed);
  });
  it("keeps a leading BOM or at least the content (BOM is not content)", () => {
    const r = fmt(valid.bom!);
    expect(r.ok).toBe(true);
  });
  it("CRLF input: output text content equal after XML newline normalisation", () => {
    const r = fmt(valid.crlf!);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toContain("x\r\ny");
  });
});

describe("QA: invalid input never produces output", () => {
  it.each([
    ["nul char ref", "<a>&#x0;</a>"],
    ["multiple roots", "<a/><b/>"],
    ["non-xml text", "hello world"],
    ["json", '{"a":1}'],
    ["unclosed", "<a><b></a>"],
    ["undeclared prefix", "<p:a/>"],
    ["duplicate attr", '<a x="1" x="2"/>'],
    ["comment with --", "<a><!-- a -- b --></a>"],
    ["cdata end in text", "<a>]]></a>"],
    ["lt in attr", '<a t="<"/>'],
    ["undefined entity", "<a>&nbsp;</a>"],
    ["trailing garbage", "<a/>x"],
    ["decl not first", ' <?xml version="1.0"?><a/>'],
  ])("%s", (_n, text) => {
    for (const r of [fmt(text), min(text), validateXml(text, parser)]) {
      expect(r.ok).toBe(false);
    }
  });
  it("does not auto-repair", () => {
    const r = fmt("<a><b>1</a>");
    expect(r.ok).toBe(false);
  });
});

describe("QA: defect probes (expected per PRD 3.5: no silent content loss, valid XML accepted)", () => {
  it("BUG-1 non-XML whitespace characters between elements are content and survive (NBSP)", () => {
    const text = "<a><b/> <c/></a>";
    const r = fmt(text);
    // either the NBSP survives, or the tool refuses; silent drop is the defect
    if (r.ok) expect(r.value).toContain(" ");
  });
  it("BUG-1 em space / ideographic space between elements survive", () => {
    for (const ch of [" ", "　", "​", " ", "﻿"]) {
      const text = `<a><b/>${ch}<c/></a>`;
      if (!validateXml(text, parser).ok) continue;
      const r = min(text);
      if (r.ok) expect(r.value, JSON.stringify(ch)).toContain(ch);
    }
  });
  it("BUG-2 an element called parsererror is valid XML", () => {
    const r = fmt("<parsererror><x/></parsererror>");
    expect(r.ok).toBe(true);
    expect(validateXml("<root><parsererror>t</parsererror></root>", parser).ok).toBe(true);
  });
  it("BUG-3 DOCTYPE internal subset comment with an apostrophe", () => {
    const text = "<!DOCTYPE a [<!-- don't --><!ELEMENT a ANY>]><a/>";
    expect(validateXml(text, parser).ok).toBe(true);
    expect(fmt(text).ok).toBe(true);
  });
  it("DOCTYPE internal subset comment with ']' ", () => {
    const text = "<!DOCTYPE a [<!-- a ] b --><!ELEMENT a ANY>]><a/>";
    expect(validateXml(text, parser).ok).toBe(true);
    expect(fmt(text).ok).toBe(true);
  });
  it("attribute value that mentions xml:space does not change behaviour", () => {
    const text = `<a xml:space="preserve"><b t=' xml:space="default"'> <c/> </b></a>`;
    const r = fmt(text);
    expect(r.ok && r.value).toBe(text);
  });
  it("tab / newline only element-only separators are removed, content kept", () => {
    const r = min("<a>\t<b/>\r\n\t<c/>\n</a>");
    expect(r.ok && r.value).toBe("<a><b/><c/></a>");
  });
});

describe("QA: scale", () => {
  it("very deep nesting does not throw", { timeout: 60_000 }, () => {
    for (const depth of [500, 3000]) {
      const text = "<a>".repeat(depth) + "x" + "</a>".repeat(depth);
      let threw: unknown = null;
      let res;
      try {
        res = fmt(text);
      } catch (e) {
        threw = e;
      }
      expect(threw, `depth ${depth}`).toBeNull();
      expect(res).toBeDefined();
    }
  });
  it("very deep element-only nesting does not throw", { timeout: 60_000 }, () => {
    const depth = 3000;
    const text = "<a>".repeat(depth) + "<z/>" + "</a>".repeat(depth);
    expect(() => fmt(text)).not.toThrow();
    expect(() => min(text)).not.toThrow();
  });
  it("large input (~5 MB) completes", () => {
    const row = '<row id="1" name="é&amp;"><v>text</v><!-- c --><w/></row>\n';
    const text = "<root>\n" + row.repeat(Math.ceil(5_000_000 / row.length)) + "</root>";
    const t0 = performance.now();
    const f = fmt(text);
    const t1 = performance.now();
    const m = min(text);
    const t2 = performance.now();
    console.log(
      `QA timing ${text.length} chars: format ${Math.round(t1 - t0)}ms, minify ${Math.round(t2 - t1)}ms`,
    );
    expect(f.ok).toBe(true);
    expect(m.ok).toBe(true);
  }, 60_000);
});
