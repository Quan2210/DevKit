/**
 * XML corpus for the XML Formatter (PRD 3.5 and 9.3). Valid inputs must survive beautify and
 * minify with the same content; malformed ones must produce an error and no output.
 */
export interface XmlCase {
  name: string;
  input: string;
}

export const validXml: XmlCase[] = [
  { name: "simple", input: "<root><a>1</a><b>2</b></root>" },
  { name: "nested", input: "<a><b><c><d>deep</d></c></b></a>" },
  {
    name: "attributes and namespaces",
    input:
      '<root xmlns="urn:default" xmlns:x="urn:x" id="1" x:flag="yes"><x:item x:id="2">v</x:item></root>',
  },
  { name: "comment", input: "<root><!-- keep me --><a>1</a></root>" },
  { name: "cdata", input: "<root><![CDATA[<not>&parsed]]></root>" },
  {
    name: "unicode and escaped entities",
    input:
      "<root><vi>Xin chào</vi><e>😀</e><esc>a &lt; b &amp; c &gt; d &quot;q&quot;</esc></root>",
  },
  { name: "empty elements", input: '<root><a/><b></b><c attr=""/></root>' },
  {
    name: "processing instruction and declaration",
    input: '<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet href="s.css"?><root>1</root>',
  },
  {
    name: "mixed content (whitespace is significant)",
    input: "<p>Hello <b>big</b> world !</p>",
  },
  {
    name: "xml:space preserve",
    input: '<pre xml:space="preserve">  two  spaces\n  and a newline </pre>',
  },
];

export const malformedXml: XmlCase[] = [
  { name: "unclosed tag", input: "<root><a></root>" },
  { name: "mismatched tags", input: "<a><b></a></b>" },
  { name: "two root elements", input: "<a/><b/>" },
  { name: "unquoted attribute", input: "<a id=1/>" },
  { name: "undefined entity", input: "<a>&nope;</a>" },
  { name: "empty input", input: "" },
  { name: "text only", input: "just text" },
];
