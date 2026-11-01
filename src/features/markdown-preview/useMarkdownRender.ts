import { useEffect, useState } from "react";
import { useDebounced } from "../../hooks/useDebounced";
import type { RenderResult } from "./core/pipeline";
import type { HeadingEntry } from "./core/plugins";
import { RenderCancelled, createRenderer } from "./core/renderer";

export interface MarkdownRenderState {
  html: string;
  headings: HeadingEntry[];
  droppedHtml: boolean;
  /** The last render failed; `html` is the previous successful one. */
  failed: boolean;
  /** The shown preview is older than the current input. */
  pending: boolean;
  /** Render outside the preview cycle (used by export when the preview is not current). */
  renderNow: (source: string, allowExternalImages: boolean) => Promise<RenderResult>;
}

interface Rendered {
  html: string;
  headings: HeadingEntry[];
  droppedHtml: boolean;
  failed: boolean;
  forSource: string | null;
  forExternal: boolean;
}

const EMPTY: Rendered = {
  html: "",
  headings: [],
  droppedHtml: false,
  failed: false,
  forSource: null,
  forExternal: false,
};

/** The pause grows with the document so typing in a big file does not trigger a render per keystroke. */
const debounceFor = (length: number) => Math.min(1500, 120 + Math.floor(length / 1500));

/**
 * Debounced render of `source`. While `enabled` is false (preview hidden) nothing is rendered; a
 * stale render is cancelled when a newer one starts; failures keep the previous preview.
 */
export function useMarkdownRender(
  source: string,
  allowExternalImages: boolean,
  enabled: boolean,
): MarkdownRenderState {
  const debounced = useDebounced(source, debounceFor(source.length));
  const [renderer] = useState(createRenderer);
  // Export renders on its own worker so it never cancels the preview's render.
  const [exporter] = useState(createRenderer);
  const [rendered, setRendered] = useState<Rendered>(EMPTY);

  useEffect(() => () => renderer.dispose(), [renderer]);
  useEffect(() => () => exporter.dispose(), [exporter]);

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    renderer.render(debounced, { allowExternalImages }).then(
      (result) => {
        if (current) {
          setRendered({
            ...result,
            failed: false,
            forSource: debounced,
            forExternal: allowExternalImages,
          });
        }
      },
      (error: unknown) => {
        if (current && !(error instanceof RenderCancelled)) {
          setRendered((previous) => ({
            ...previous,
            failed: true,
            forSource: debounced,
            forExternal: allowExternalImages,
          }));
        }
      },
    );
    return () => {
      current = false;
      renderer.cancel();
    };
  }, [debounced, allowExternalImages, enabled, renderer]);

  const upToDate = rendered.forSource === source && rendered.forExternal === allowExternalImages;
  return {
    html: rendered.html,
    headings: rendered.headings,
    droppedHtml: rendered.droppedHtml,
    failed: rendered.failed,
    pending: enabled && !upToDate,
    renderNow: (text, allow) => exporter.render(text, { allowExternalImages: allow }),
  };
}
