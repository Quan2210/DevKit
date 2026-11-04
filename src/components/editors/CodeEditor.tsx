import { lazy, Suspense, type Ref } from "react";
import { useT } from "../../i18n/useT";
import { ClientOnly } from "../common/ClientOnly";
import { Skeleton } from "../common/Skeleton";
import type { CodeEditorHandle, CodeEditorProps } from "./types";

export type { CodeEditorHandle, CodeEditorLanguage, CodeEditorProps, LineHighlight } from "./types";

// CodeMirror is a separate chunk: Home and tools that do not edit code never download it (SD-11).
const CodeEditorImpl = lazy(() => import("./CodeEditorImpl"));

/** Lazy, client-only editor. The prerender and the first paint show a skeleton of the same size. */
export function CodeEditor(props: CodeEditorProps & { ref?: Ref<CodeEditorHandle> }) {
  const t = useT();
  const { ref, ...rest } = props;
  const fallback = <Skeleton className="h-full min-h-48 w-full" />;
  return (
    <div className="h-full min-h-48" data-editor-label={t("editor.loading")}>
      <ClientOnly fallback={fallback}>
        {() => (
          <Suspense fallback={fallback}>
            <CodeEditorImpl {...rest} handleRef={ref} />
          </Suspense>
        )}
      </ClientOnly>
    </div>
  );
}
