import { DEFAULT_LOCALE, translate, type MessageKey, type MessageParams } from "../../../i18n";
import { fail, ok, type Result, type ToolError } from "../../../lib/result";

export type XmlIndent = 2 | 4;

/** Anything shaped like the browser's `DOMParser` (tests pass jsdom's). */
export interface XmlParser {
  parseFromString(text: string, type: "application/xml"): XmlDocument;
}
type XmlDocument = Document;

const t = (key: MessageKey, params?: MessageParams): string =>
  translate(DEFAULT_LOCALE, key, params);

// ---------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------

/** Chrome and Safari put their error in the XHTML namespace, Firefox in its own; a user's element has neither. */
const PARSER_ERROR_NAMESPACES = [
  "http://www.w3.org/1999/xhtml",
  "http://www.mozilla.org/newlayout/xml/parsererror.xml",
];

function findParserError(doc: XmlDocument): Element | null {
  for (const element of doc.getElementsByTagNameNS("*", "parsererror")) {
    if (PARSER_ERROR_NAMESPACES.includes(element.namespaceURI ?? "")) return element;
  }
  return null;
}

/**
 * Chrome and Safari: "error on line 3 at column 7: ...", Firefox: "Line Number 3, Column 7:",
 * jsdom (saxes): "3:7: ...". The wording is the engine's; only the position is normalised.
 */
export function extractXmlPosition(message: string): ToolError["position"] {
  const chrome = message.match(/line (\d+)(?: at)? column (\d+)/i);
  if (chrome) return { line: Number(chrome[1]), column: Number(chrome[2]) };
  const firefox = message.match(/Line Number (\d+), Column (\d+)/i);
  if (firefox) return { line: Number(firefox[1]), column: Number(firefox[2]) };
  const saxes = message.match(/(?:^|\s)(\d+):(\d+):/);
  if (saxes) return { line: Number(saxes[1]), column: Number(saxes[2]) };
  const lineOnly = message.match(/line (?:number )?(\d+)/i);
  if (lineOnly) return { line: Number(lineOnly[1]), column: 1 };
  return undefined;
}

function engineDetail(message: string): string | undefined {
  const lines = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const specific =
    lines.find((line) => /error|expected|mismatch|unclosed|invalid/i.test(line)) ?? lines[0];
  return specific ? specific.slice(0, 300) : undefined;
}

/** Parses with the browser's XML parser and normalises its error into a `ToolError`. */
export function validateXml(text: string, parser: XmlParser): Result<XmlDocument> {
  if (text.trim() === "") return fail({ kind: "validation", message: t("xml.empty") });
  let doc: XmlDocument;
  try {
    doc = parser.parseFromString(text, "application/xml");
  } catch (error) {
    // jsdom throws instead of returning a parsererror document.
    const message = error instanceof Error ? error.message : "";
    return fail({
      kind: "validation",
      message: t("xml.invalid"),
      detail: engineDetail(message),
      position: extractXmlPosition(message),
    });
  }
  const problem = findParserError(doc);
  if (problem) {
    const message = problem.textContent ?? "";
    return fail({
      kind: "validation",
      message: t("xml.invalid"),
      detail: engineDetail(message),
      position: extractXmlPosition(message),
    });
  }
  return ok(doc);
}

// ---------------------------------------------------------------------------------------------
// Tokenizer and tree. The input is already known to be well formed, so this only has to split it
// into pieces; every piece keeps its exact source text (quotes, entities, attribute order).
// ---------------------------------------------------------------------------------------------

type XmlNode =
  | { type: "element"; start: string; end: string; selfClosing: boolean; children: XmlNode[] }
  | { type: "text" | "comment" | "cdata" | "pi" | "doctype"; raw: string };

class XmlStructureError extends Error {}

function scanTag(source: string, from: number): number {
  let quote = "";
  for (let i = from; i < source.length; i += 1) {
    const char = source[i]!;
    if (quote) {
      if (char === quote) quote = "";
    } else if (char === '"' || char === "'") quote = char;
    else if (char === ">") return i + 1;
  }
  throw new XmlStructureError("unterminated tag");
}

function scanDoctype(source: string, from: number): number {
  let depth = 0;
  let quote = "";
  for (let i = from; i < source.length; i += 1) {
    const char = source[i]!;
    if (quote) {
      if (char === quote) quote = "";
    } else if (source.startsWith("<!--", i)) i = endOf(source, "-->", i + 4) - 1;
    else if (source.startsWith("<?", i)) i = endOf(source, "?>", i + 2) - 1;
    else if (char === '"' || char === "'") quote = char;
    else if (char === "[") depth += 1;
    else if (char === "]") depth -= 1;
    else if (char === ">" && depth <= 0) return i + 1;
  }
  throw new XmlStructureError("unterminated doctype");
}

function endOf(source: string, marker: string, from: number): number {
  const at = source.indexOf(marker, from);
  if (at < 0) throw new XmlStructureError(`missing ${marker}`);
  return at + marker.length;
}

function tokenize(source: string): XmlNode[] {
  const root: XmlNode[] = [];
  const stack: Array<Extract<XmlNode, { type: "element" }>> = [];
  const add = (node: XmlNode) => (stack.at(-1)?.children ?? root).push(node);
  let i = 0;
  while (i < source.length) {
    if (source[i] !== "<") {
      const next = source.indexOf("<", i);
      const stop = next < 0 ? source.length : next;
      add({ type: "text", raw: source.slice(i, stop) });
      i = stop;
    } else if (source.startsWith("<!--", i)) {
      const stop = endOf(source, "-->", i + 4);
      add({ type: "comment", raw: source.slice(i, stop) });
      i = stop;
    } else if (source.startsWith("<![CDATA[", i)) {
      const stop = endOf(source, "]]>", i + 9);
      add({ type: "cdata", raw: source.slice(i, stop) });
      i = stop;
    } else if (source.startsWith("<?", i)) {
      const stop = endOf(source, "?>", i + 2);
      add({ type: "pi", raw: source.slice(i, stop) });
      i = stop;
    } else if (source.startsWith("<!", i)) {
      const stop = scanDoctype(source, i);
      add({ type: "doctype", raw: source.slice(i, stop) });
      i = stop;
    } else if (source.startsWith("</", i)) {
      const stop = scanTag(source, i);
      const open = stack.pop();
      if (!open) throw new XmlStructureError("unexpected end tag");
      open.end = source.slice(i, stop);
      i = stop;
    } else {
      const stop = scanTag(source, i);
      const raw = source.slice(i, stop);
      const selfClosing = raw.endsWith("/>");
      const element: Extract<XmlNode, { type: "element" }> = {
        type: "element",
        start: raw,
        end: "",
        selfClosing,
        children: [],
      };
      add(element);
      if (!selfClosing) stack.push(element);
      i = stop;
    }
  }
  if (stack.length > 0) throw new XmlStructureError("unclosed element");
  return root;
}

// ---------------------------------------------------------------------------------------------
// Whitespace rules. Whitespace is content in mixed content and under xml:space="preserve", so those
// elements are written back verbatim; only element-only content is re-indented or compacted.
// ---------------------------------------------------------------------------------------------

/** XML whitespace is exactly these four characters; String.trim() also strips NBSP and friends, which are content. */
const XML_BLANK = /^[ \t\r\n]*$/;
const isBlank = (node: XmlNode) => node.type === "text" && XML_BLANK.test(node.raw);

function spaceMode(start: string, inherited: boolean): boolean {
  const match = start.match(/\sxml:space\s*=\s*(?:"([^"]*)"|'([^']*)')/);
  if (!match) return inherited;
  return (match[1] ?? match[2]) === "preserve";
}

function verbatim(node: XmlNode): string {
  if (node.type !== "element") return node.raw;
  return node.start + node.children.map(verbatim).join("") + node.end;
}

/** True when the children are only elements, comments, PIs and indentation. */
function isElementOnly(children: XmlNode[]): boolean {
  const hasStructure = children.some((child) => child.type !== "text");
  return (
    hasStructure &&
    children.every((child) => child.type !== "cdata" && (child.type !== "text" || isBlank(child)))
  );
}

function render(node: XmlNode, depth: number, preserve: boolean, unit: string): string {
  const pad = unit === "" ? "" : unit.repeat(depth);
  const eol = unit === "" ? "" : "\n";
  if (node.type !== "element") return pad + node.raw;
  const keep = spaceMode(node.start, preserve);
  if (node.selfClosing) return pad + node.start;
  if (keep || !isElementOnly(node.children)) return pad + verbatim(node);
  const lines = node.children
    .filter((child) => !isBlank(child))
    .map((child) => render(child, depth + 1, keep, unit));
  return pad + node.start + eol + lines.join(eol) + eol + pad + node.end;
}

function serialize(tree: XmlNode[], unit: string): string {
  const eol = unit === "" ? "" : "\n";
  return tree
    .filter((node) => !isBlank(node))
    .map((node) => render(node, 0, false, unit))
    .join(eol);
}

// ---------------------------------------------------------------------------------------------
// Equivalence check: the output must parse to the same document as the input, ignoring only
// indentation. This is the guarantee behind "does not change content" (PRD 3.5).
// ---------------------------------------------------------------------------------------------

function signature(node: Node, preserve: boolean, out: string[]): void {
  switch (node.nodeType) {
    case 1: {
      const element = node as Element;
      const attributes = [...element.attributes]
        .map((attribute) => `${attribute.name}=${JSON.stringify(attribute.value)}`)
        .sort()
        .join(" ");
      const space = element.getAttribute("xml:space");
      const keep = space === null ? preserve : space === "preserve";
      out.push(`<${element.tagName} ${attributes}>`);
      const children = [...element.childNodes];
      const onlyStructure =
        children.some((child) => child.nodeType !== 3) &&
        children.every(
          (child) =>
            child.nodeType !== 4 && (child.nodeType !== 3 || XML_BLANK.test(child.nodeValue ?? "")),
        );
      for (const child of children) {
        if (!keep && onlyStructure && child.nodeType === 3) continue;
        signature(child, keep, out);
      }
      out.push(`</${element.tagName}>`);
      break;
    }
    case 3:
      out.push(`#text:${JSON.stringify(node.nodeValue)}`);
      break;
    case 4:
      out.push(`#cdata:${JSON.stringify(node.nodeValue)}`);
      break;
    case 7:
      out.push(`#pi:${(node as ProcessingInstruction).target}:${JSON.stringify(node.nodeValue)}`);
      break;
    case 8:
      out.push(`#comment:${JSON.stringify(node.nodeValue)}`);
      break;
    default:
      break;
  }
}

function documentSignature(doc: XmlDocument): string {
  const out: string[] = [];
  for (const child of doc.childNodes) {
    if (child.nodeType === 10) out.push(`#doctype:${(child as DocumentType).name}`);
    else signature(child, false, out);
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------------------------

function transform(text: string, unit: string, parser: XmlParser): Result<string> {
  const parsed = validateXml(text, parser);
  if (!parsed.ok) return parsed;
  try {
    // A leading BOM is encoding, not content.
    const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    const output = serialize(tokenize(body), unit);
    // Never hand back text that is not the same document (R: no silent data loss).
    const again = validateXml(output, parser);
    if (!again.ok || documentSignature(again.value) !== documentSignature(parsed.value)) {
      return fail({ kind: "unexpected", message: t("xml.unsupported") });
    }
    return ok(output);
  } catch (error) {
    // Deeply nested documents overflow the recursive walk; say so instead of a generic failure.
    const deep = error instanceof RangeError;
    return fail({ kind: "unexpected", message: t(deep ? "xml.tooDeep" : "xml.unsupported") });
  }
}

export function formatXml(text: string, indent: XmlIndent, parser: XmlParser): Result<string> {
  return transform(text, " ".repeat(indent), parser);
}

export function minifyXml(text: string, parser: XmlParser): Result<string> {
  return transform(text, "", parser);
}

/** The browser's parser; only call on the client. */
export const browserParser = (): XmlParser => new DOMParser() as unknown as XmlParser;
