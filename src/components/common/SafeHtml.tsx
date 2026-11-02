import type { Ref } from "react";

export interface SafeHtmlProps {
  /** HTML produced by the Markdown pipeline (already sanitized). Never pass any other string. */
  html: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * The only place in the app that sets innerHTML (docs/04 Change 4.6); ESLint forbids
 * `dangerouslySetInnerHTML` everywhere else. Keeping it to one tiny component makes the
 * trust boundary easy to audit.
 */
export function SafeHtml({ html, className, ref }: SafeHtmlProps) {
  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
