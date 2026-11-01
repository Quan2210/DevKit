import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { rehypeHighlight } from "./highlight";
import {
  rehypeHeadings,
  rehypeImagePolicy,
  rehypeLinkPolicy,
  remarkCountRawHtml,
  type HeadingEntry,
} from "./plugins";
import { sanitizeSchema } from "./sanitize-schema";

export interface RenderOptions {
  /** Let http(s) images load (each one makes a request). Off by default for privacy. */
  allowExternalImages?: boolean;
}

export interface RenderResult {
  /** Sanitized HTML, safe to display and to export. */
  html: string;
  headings: HeadingEntry[];
  /** True when the source contained raw HTML, which is never rendered. */
  droppedHtml: boolean;
}

/**
 * Markdown to safe HTML (docs/03 §3.4). Order matters:
 *   parse (CommonMark + GFM) -> to HTML tree (raw HTML is dropped here) -> sanitize ->
 *   link and image policies -> highlight code -> heading ids -> stringify.
 * Everything after `sanitize` only adds data this module generates itself.
 * Pure and DOM-free so it also runs in a Web Worker.
 */
export async function renderMarkdown(
  source: string,
  { allowExternalImages = false }: RenderOptions = {},
): Promise<RenderResult> {
  const counts = { rawHtml: 0 };
  const state = { headings: [] as HeadingEntry[] };

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkCountRawHtml, counts)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeLinkPolicy)
    .use(rehypeImagePolicy, { allowExternalImages })
    .use(rehypeHighlight)
    .use(rehypeHeadings, state)
    .use(rehypeStringify)
    .process(source);

  return { html: String(file), headings: state.headings, droppedHtml: counts.rawHtml > 0 };
}
