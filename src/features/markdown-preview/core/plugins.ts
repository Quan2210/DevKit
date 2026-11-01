import type { Element, Root as HastRoot } from "hast";
import type { Root as MdastRoot } from "mdast";
import GithubSlugger from "github-slugger";
import { toString } from "hast-util-to-string";
import { visit } from "unist-util-visit";
import { DEFAULT_LOCALE, translate } from "../../../i18n";

export interface HeadingEntry {
  depth: number;
  id: string;
  text: string;
}

/** Counts raw HTML in the source. remark-rehype then drops those nodes, so nothing raw reaches the output. */
export function remarkCountRawHtml(state: { rawHtml: number }) {
  return (tree: MdastRoot) => {
    visit(tree, "html", () => {
      state.rawHtml += 1;
    });
  };
}

/** Links that leave the site open in a new tab without giving the target a handle on this page. */
export function rehypeLinkPolicy() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") return;
      const href = String(node.properties?.href ?? "");
      if (/^https?:\/\//i.test(href) || href.startsWith("//")) {
        node.properties = {
          ...node.properties,
          target: "_blank",
          rel: ["noopener", "noreferrer"],
        };
      }
    });
  };
}

const DATA_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]*$/i;

/**
 * Privacy (PRD 3.10, SD-7): an image whose source is not an inline raster image is replaced by a
 * placeholder that has no `src` at all, so the browser cannot make a request. External images only
 * keep their source when the user explicitly opts in, and then without a referrer.
 */
export function rehypeImagePolicy(options: { allowExternalImages: boolean }) {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "img") return;
      const src = String(node.properties?.src ?? "");
      const alt = String(node.properties?.alt ?? "").trim();

      if (DATA_IMAGE.test(src)) return;

      const external = /^https?:\/\//i.test(src) || src.startsWith("//");
      if (external && options.allowExternalImages) {
        node.properties = {
          ...node.properties,
          src: src.startsWith("//") ? `https:${src}` : src,
          referrerPolicy: "no-referrer",
          loading: "lazy",
        };
        return;
      }

      const label = alt
        ? translate(DEFAULT_LOCALE, "markdown.imageBlocked", { alt })
        : translate(DEFAULT_LOCALE, "markdown.imageBlockedNoAlt");
      node.tagName = "span";
      node.properties = { className: ["md-blocked-image"], role: "img", ariaLabel: label };
      node.children = [{ type: "text", value: label }];
    });
  };
}

/** Heading ids are generated here after sanitizing (safe by construction) with an `md-` prefix, and collected for the TOC. */
export function rehypeHeadings(state: { headings: HeadingEntry[] }) {
  return (tree: HastRoot) => {
    const slugger = new GithubSlugger();
    visit(tree, "element", (node: Element) => {
      const match = /^h([1-6])$/.exec(node.tagName);
      if (!match) return;
      const text = toString(node);
      const id = `md-${slugger.slug(text) || "section"}`;
      node.properties = { ...node.properties, id };
      state.headings.push({ depth: Number(match[1]), id, text });
    });
  };
}
