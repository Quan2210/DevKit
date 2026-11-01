import type { MessageKey } from "./locales/vi";

export type Locale = "vi";

/** A complete catalog must define every key of the source catalog (`vi`). */
export type Catalog = Record<MessageKey, string>;

export type MessageParams = Record<string, string | number>;

/** Structured help content for a tool page; rendered by `GuideContent`, never written as raw JSX text. */
export type GuideBlock =
  { type: "h2"; text: string } | { type: "p"; text: string } | { type: "ul"; items: string[] };
