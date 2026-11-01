import { useEffect, useRef, type ReactNode } from "react";
import { SafeHtml } from "../../components/common/SafeHtml";
import { useT } from "../../i18n/useT";
import { copyText } from "../../lib/io/clipboard";
import { cn } from "../../lib/cn";

export interface PreviewPaneProps {
  /** Sanitized HTML from the Markdown pipeline. */
  html: string;
  /** Narrow reading column (~75ch) like the exported document. */
  docWidth: boolean;
  /** Shown when there is nothing to preview. */
  empty: ReactNode;
  busy: boolean;
}

/** The rendered document, with a Copy button added to every code block after each render. */
export function PreviewPane({ html, docWidth, empty, busy }: PreviewPaneProps) {
  const t = useT();
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    for (const pre of root.querySelectorAll("pre")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "md-copy-code";
      button.textContent = t("markdown.copyCode");
      button.addEventListener("click", async () => {
        const copied = await copyText(pre.querySelector("code")?.textContent ?? "");
        button.textContent = copied ? t("action.copied") : t("action.copyFailed");
        timers.push(setTimeout(() => (button.textContent = t("markdown.copyCode")), 1500));
      });
      pre.appendChild(button);
    }
    return () => {
      timers.forEach(clearTimeout);
      root.querySelectorAll(".md-copy-code").forEach((button) => button.remove());
    };
  }, [html, t]);

  return (
    <div
      role="region"
      aria-label={t("markdown.previewLabel")}
      aria-busy={busy || undefined}
      // A scrollable region must be reachable by keyboard (WCAG 2.1.1).
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className="h-full overflow-auto p-4"
    >
      {html === "" ? (
        empty
      ) : (
        <SafeHtml
          ref={container}
          html={html}
          className={cn("md-prose", docWidth && "mx-auto max-w-[75ch]")}
        />
      )}
    </div>
  );
}
