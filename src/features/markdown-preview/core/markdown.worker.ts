import { renderMarkdown } from "./pipeline";

export interface WorkerRequest {
  id: number;
  source: string;
  allowExternalImages: boolean;
}

export type WorkerResponse =
  | { id: number; ok: true; result: Awaited<ReturnType<typeof renderMarkdown>> }
  | { id: number; ok: false };

/** Runs the Markdown pipeline off the main thread for large documents. Strings in, strings out. */
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse): void;
};

scope.onmessage = async (event) => {
  const { id, source, allowExternalImages } = event.data;
  try {
    scope.postMessage({
      id,
      ok: true,
      result: await renderMarkdown(source, { allowExternalImages }),
    });
  } catch {
    scope.postMessage({ id, ok: false });
  }
};
