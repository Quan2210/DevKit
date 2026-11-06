import { lazy, Suspense, type Ref } from "react";
import { useT } from "../../i18n/useT";
import { ClientOnly } from "../common/ClientOnly";
import { Skeleton } from "../common/Skeleton";
import type { DiffEditorHandle, DiffEditorProps } from "./diffTypes";

export type { DiffEditorHandle, DiffEditorProps, DiffReport, DiffView } from "./diffTypes";

// Like CodeEditor, the merge view is its own chunk, loaded only on the Text Compare route (SD-11).
const DiffEditorImpl = lazy(() => import("./DiffEditorImpl"));

/** Lazy, client-only side-by-side / unified diff editor. */
export function DiffEditor(props: DiffEditorProps & { ref?: Ref<DiffEditorHandle> }) {
  const t = useT();
  const { ref, ...rest } = props;
  const fallback = <Skeleton className="h-full min-h-48 w-full" />;
  return (
    <div className="h-full min-h-48" data-editor-label={t("editor.loading")}>
      <ClientOnly fallback={fallback}>
        {() => (
          <Suspense fallback={fallback}>
            <DiffEditorImpl {...rest} handleRef={ref} />
          </Suspense>
        )}
      </ClientOnly>
    </div>
  );
}
