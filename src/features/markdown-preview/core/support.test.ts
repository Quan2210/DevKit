import { afterEach, describe, expect, it, vi } from "vitest";
import { buildHtmlDocument } from "./exportHtml";
import { RenderCancelled, WORKER_THRESHOLD, createRenderer } from "./renderer";
import { MAX_FILE_BYTES, checkFileSize, decodeMarkdownFile } from "./readFile";

const bytes = (...values: number[]) => Uint8Array.from(values).buffer;
const encode = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;

describe("decodeMarkdownFile (AC: files are read locally, safely)", () => {
  it("reads UTF-8 text, strips a leading BOM and keeps Unicode", () => {
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode("# Chào 😀")]);
    const result = decodeMarkdownFile(withBom.buffer);
    expect(result.ok && result.value).toBe("# Chào 😀");
  });

  it("accepts an empty file", () => {
    expect(decodeMarkdownFile(encode(""))).toEqual({ ok: true, value: "" });
  });

  it("rejects bytes that are not UTF-8 instead of filling the editor with replacement characters", () => {
    const result = decodeMarkdownFile(bytes(0xff, 0xfe, 0x41));
    expect(!result.ok && result.error.message).toContain("UTF-8");
  });

  it("rejects binary content (NUL bytes)", () => {
    expect(decodeMarkdownFile(encode("abc\u0000def")).ok).toBe(false);
  });

  it("rejects a file over 5 MB, by size before reading and by length after", () => {
    expect(checkFileSize(MAX_FILE_BYTES).ok).toBe(true);
    const tooBig = checkFileSize(MAX_FILE_BYTES + 1);
    expect(!tooBig.ok && tooBig.error.message).toContain("5 MB");
    expect(decodeMarkdownFile(new ArrayBuffer(MAX_FILE_BYTES + 1)).ok).toBe(false);
  });
});

describe("buildHtmlDocument (export)", () => {
  it("wraps the body in a standalone document with inline style and no script", () => {
    const html = buildHtmlDocument("<h1>Hi</h1>", "Tiêu đề");
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<h1>Hi</h1>");
    expect(html).toContain("<style>");
    expect(html.toLowerCase()).not.toContain("<script");
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("escapes the title so it cannot inject markup", () => {
    const html = buildHtmlDocument("<p>x</p>", '</title><script>alert(1)</script>"');
    expect(html).not.toContain("</title><script>");
    expect(html).toContain("&lt;/title&gt;&lt;script&gt;");
  });
});

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  terminated = false;
  sent: unknown[] = [];
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage(message: unknown) {
    this.sent.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  reply(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

describe("createRenderer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    FakeWorker.instances = [];
  });

  const big = "x".repeat(WORKER_THRESHOLD + 1);

  it("renders small documents on the main thread without creating a worker", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const renderer = createRenderer();
    const result = await renderer.render("# hi");
    expect(result.html).toContain("<h1");
    expect(FakeWorker.instances).toHaveLength(0);
  });

  it("falls back to the main thread when Workers are unavailable", async () => {
    vi.stubGlobal("Worker", undefined);
    const result = await createRenderer().render(big);
    expect(result.html.length).toBeGreaterThan(0);
  });

  it("sends large documents to a worker and resolves with its answer", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const renderer = createRenderer();
    const promise = renderer.render(big, { allowExternalImages: true });
    const worker = FakeWorker.instances[0]!;
    expect(worker.sent).toEqual([{ id: 1, source: big, allowExternalImages: true }]);
    worker.reply({
      id: 1,
      ok: true,
      result: { html: "<p>done</p>", headings: [], droppedHtml: false },
    });
    await expect(promise).resolves.toEqual({
      html: "<p>done</p>",
      headings: [],
      droppedHtml: false,
    });
  });

  it("terminates a stale worker when a newer large render starts", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const renderer = createRenderer();
    const first = renderer.render(big);
    const firstError = first.catch((error: unknown) => error);
    const second = renderer.render(big + "y");
    expect(FakeWorker.instances).toHaveLength(2);
    expect(FakeWorker.instances[0]!.terminated).toBe(true);
    expect(await firstError).toBeInstanceOf(RenderCancelled);
    FakeWorker.instances[1]!.reply({
      id: 2,
      ok: true,
      result: { html: "<p>2</p>", headings: [], droppedHtml: false },
    });
    await expect(second).resolves.toMatchObject({ html: "<p>2</p>" });
  });

  it("reuses an idle worker and sends anything beyond a few KB to it", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const renderer = createRenderer();
    const medium = "# t\n\n" + "word ".repeat(2_000); // ~10 KB, far below the old 200,000 limit
    const first = renderer.render(medium);
    FakeWorker.instances[0]!.reply({
      id: 1,
      ok: true,
      result: { html: "<p>1</p>", headings: [], droppedHtml: false },
    });
    await first;
    const second = renderer.render(medium + "x");
    expect(FakeWorker.instances).toHaveLength(1);
    FakeWorker.instances[0]!.reply({
      id: 2,
      ok: true,
      result: { html: "<p>2</p>", headings: [], droppedHtml: false },
    });
    await expect(second).resolves.toMatchObject({ html: "<p>2</p>" });
  });

  it("cancel() stops in-flight work and dispose() is safe to repeat", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const renderer = createRenderer();
    const pending = renderer.render(big).catch((error: unknown) => error);
    renderer.cancel();
    expect(FakeWorker.instances[0]!.terminated).toBe(true);
    expect(await pending).toBeInstanceOf(RenderCancelled);
    renderer.dispose();
    renderer.dispose();
  });

  it("rejects when the worker fails or reports an error, never hanging", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const renderer = createRenderer();
    const failed = renderer.render(big).catch((error: unknown) => error);
    FakeWorker.instances[0]!.reply({ id: 1, ok: false });
    expect(await failed).toBeInstanceOf(Error);

    const crashed = renderer.render(big).catch((error: unknown) => error);
    FakeWorker.instances[0]!.onerror?.();
    expect(await crashed).toBeInstanceOf(Error);
  });

  it("gives up after the timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("Worker", FakeWorker);
    const renderer = createRenderer();
    const timedOut = renderer.render(big).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(61_000);
    expect(await timedOut).toBeInstanceOf(Error);
    expect(FakeWorker.instances[0]!.terminated).toBe(true);
  });
});
