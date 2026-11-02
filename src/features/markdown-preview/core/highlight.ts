import type { Element, Root as HastRoot } from "hast";
import { toString } from "hast-util-to-string";
import { createLowlight } from "lowlight";
import { visit } from "unist-util-visit";

type Grammar = Parameters<ReturnType<typeof createLowlight>["register"]>[1];

/** Grammars are separate chunks, loaded only when a document actually uses the language. */
const LOADERS: Record<string, () => Promise<{ default: Grammar }>> = {
  javascript: () => import("highlight.js/lib/languages/javascript"),
  typescript: () => import("highlight.js/lib/languages/typescript"),
  json: () => import("highlight.js/lib/languages/json"),
  bash: () => import("highlight.js/lib/languages/bash"),
  css: () => import("highlight.js/lib/languages/css"),
  xml: () => import("highlight.js/lib/languages/xml"),
  python: () => import("highlight.js/lib/languages/python"),
  sql: () => import("highlight.js/lib/languages/sql"),
  yaml: () => import("highlight.js/lib/languages/yaml"),
  markdown: () => import("highlight.js/lib/languages/markdown"),
  diff: () => import("highlight.js/lib/languages/diff"),
};

const ALIASES: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  html: "xml",
  svg: "xml",
  yml: "yaml",
  py: "python",
  md: "markdown",
};

/** Canonical grammar name for a fence language, or undefined when it is not supported. */
export function resolveLanguage(name: string): string | undefined {
  const lower = name.toLowerCase();
  const canonical = ALIASES[lower] ?? lower;
  return canonical in LOADERS ? canonical : undefined;
}

const lowlight = createLowlight();

function fenceLanguage(code: Element): string | undefined {
  const classes = Array.isArray(code.properties?.className) ? code.properties.className : [];
  const found = classes.map(String).find((name) => name.startsWith("language-"));
  return found ? resolveLanguage(found.slice("language-".length)) : undefined;
}

/**
 * Tokenises fenced code. It runs after sanitizing, on nodes that are already safe: lowlight only
 * produces text and `<span class="hljs-*">`, never anything derived from raw markup.
 */
export function rehypeHighlight() {
  return async (tree: HastRoot) => {
    const blocks: Array<{ code: Element; language: string }> = [];
    visit(tree, "element", (node: Element, _index, parent) => {
      if (node.tagName !== "code" || (parent as Element | undefined)?.tagName !== "pre") return;
      const language = fenceLanguage(node);
      if (language) blocks.push({ code: node, language });
    });

    const needed = new Set(blocks.map((block) => block.language));
    await Promise.all(
      [...needed]
        .filter((language) => !lowlight.registered(language))
        .map(async (language) => {
          const grammar = (await LOADERS[language]!()).default;
          lowlight.register({ [language]: grammar });
        }),
    );

    for (const { code, language } of blocks) {
      const highlighted = lowlight.highlight(language, toString(code));
      code.children = highlighted.children as Element["children"];
      const existing = Array.isArray(code.properties?.className) ? code.properties.className : [];
      code.properties = { ...code.properties, className: [...existing, "hljs"] };
    }
  };
}
