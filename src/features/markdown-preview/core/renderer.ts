import type { WorkerRequest, WorkerResponse } from "./markdown.worker";
import { renderMarkdown, type RenderOptions, type RenderResult } from "./pipeline";

/**
 * Above this size the pipeline runs in a Web Worker so typing never waits on a render (docs/04 §7.1).
 * Rendering cost is roughly 4 ms per KB, so anything beyond a few KB would be a visible stall.
 */
export const WORKER_THRESHOLD = 5_000;
/** Give up on a render that takes longer than this; the previous preview stays. */
export const RENDER_TIMEOUT_MS = 60_000;

export class RenderCancelled extends Error {
  constructor() {
    super("render cancelled");
  }
}

export interface Renderer {
  render(source: string, options?: RenderOptions): Promise<RenderResult>;
  /** Stop in-flight worker work (a stale render must not keep the worker busy). */
  cancel(): void;
  dispose(): void;
}

interface Pending {
  resolve: (result: RenderResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Tiny inputs render on the main thread. Everything else goes to a worker, created lazily and reused
 * while idle. Starting a render or calling `cancel()` while one is in flight terminates that worker,
 * because a render in progress cannot be interrupted any other way and a stale one would delay the
 * current one.
 */
export function createRenderer(): Renderer {
  let worker: Worker | null = null;
  let nextId = 0;
  const pending = new Map<number, Pending>();

  const stop = (reason: Error) => {
    worker?.terminate();
    worker = null;
    for (const job of pending.values()) {
      clearTimeout(job.timer);
      job.reject(reason);
    }
    pending.clear();
  };

  const start = (): Worker => {
    const created = new Worker(new URL("./markdown.worker.ts", import.meta.url), {
      type: "module",
    });
    created.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const job = pending.get(event.data.id);
      if (!job) return;
      pending.delete(event.data.id);
      clearTimeout(job.timer);
      if (event.data.ok) job.resolve(event.data.result);
      else job.reject(new Error("render failed"));
    };
    created.onerror = () => stop(new Error("worker failed"));
    return created;
  };

  const fallback = (source: string, options: RenderOptions): Promise<RenderResult> =>
    source.length <= MAIN_THREAD_FALLBACK_LIMIT
      ? renderMarkdown(source, options)
      : Promise.reject(new Error("worker unavailable"));

  /** Above this size the main thread is not an acceptable fallback (the list parser is super-linear). */
  const MAIN_THREAD_FALLBACK_LIMIT = 500_000;

  return {
    render(source, options = {}) {
      if (source.length <= WORKER_THRESHOLD) return renderMarkdown(source, options);
      if (typeof Worker === "undefined") return fallback(source, options);

      if (pending.size > 0) stop(new RenderCancelled());
      try {
        worker ??= start();
      } catch {
        // Construction can throw (blocked module workers, CSP). Never let that escape into React.
        worker = null;
        return fallback(source, options);
      }
      const id = (nextId += 1);
      return new Promise<RenderResult>((resolve, reject) => {
        const timer = setTimeout(() => stop(new Error("render timed out")), RENDER_TIMEOUT_MS);
        pending.set(id, { resolve, reject, timer });
        const request: WorkerRequest = {
          id,
          source,
          allowExternalImages: options.allowExternalImages ?? false,
        };
        try {
          worker!.postMessage(request);
        } catch (error) {
          stop(error instanceof Error ? error : new Error("worker failed"));
        }
      });
    },
    cancel() {
      if (pending.size > 0) stop(new RenderCancelled());
    },
    dispose() {
      stop(new RenderCancelled());
    },
  };
}
