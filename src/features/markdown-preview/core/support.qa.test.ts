/** QA tests for the worker runner and file decoding (PRD 3.10 files/perf, SD-10, plan 4.4-4.5). */
import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeMarkdownFile, checkFileSize, MAX_FILE_BYTES } from "./readFile";
import { RENDER_TIMEOUT_MS, RenderCancelled, WORKER_THRESHOLD, createRenderer } from "./renderer";

class FakeWorker {
  static instances: FakeWorker[] = [];
  static failOnConstruct = false;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  terminated = false;
  sent: Array<{ id: number }> = [];
  constructor() {
    if (FakeWorker.failOnConstruct) throw new Error("Worker blocked");
    FakeWorker.instances.push(this);
  }
  postMessage(message: { id: number }) {
    this.sent.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  reply(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}
const okResult = (id: number, html = "<p>w</p>") => ({
  id,
  ok: true,
  result: { html, headings: [], droppedHtml: false },
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  FakeWorker.instances = [];
  FakeWorker.failOnConstruct = false;
});

describe("QA: renderer runner", () => {
  it("the threshold is exclusive: exactly 200,000 characters stay on the main thread", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const renderer = createRenderer();
    await renderer.render("a".repeat(WORKER_THRESHOLD));
    expect(FakeWorker.instances).toHaveLength(0);
    void renderer.render("a".repeat(WORKER_THRESHOLD + 1)).catch(() => {});
    expect(FakeWorker.instances).toHaveLength(1);
    renderer.dispose();
  });

  it("ignores a reply for an unknown or already-cancelled job", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const renderer = createRenderer();
    const big = "x".repeat(WORKER_THRESHOLD + 1);
    const job = renderer.render(big);
    const worker = FakeWorker.instances[0]!;
    worker.reply(okResult(999, "<p>stranger</p>"));
    worker.reply(okResult(1, "<p>mine</p>"));
    worker.reply(okResult(1, "<p>duplicate</p>"));
    await expect(job).resolves.toMatchObject({ html: "<p>mine</p>" });
  });

  it("a worker error after the job finished does not break the next render", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const renderer = createRenderer();
    const big = "x".repeat(WORKER_THRESHOLD + 1);
    const first = renderer.render(big);
    FakeWorker.instances[0]!.reply(okResult(1));
    await first;
    FakeWorker.instances[0]!.onerror?.();
    const second = renderer.render(big);
    FakeWorker.instances.at(-1)!.reply(okResult(2, "<p>2</p>"));
    await expect(second).resolves.toMatchObject({ html: "<p>2</p>" });
  });

  it("a timeout rejects, terminates the worker, and the next render still works", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("Worker", FakeWorker);
    const renderer = createRenderer();
    const big = "x".repeat(WORKER_THRESHOLD + 1);
    const timedOut = renderer.render(big).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(RENDER_TIMEOUT_MS - 1);
    expect(FakeWorker.instances[0]!.terminated).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    const error = await timedOut;
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(RenderCancelled);
    expect(FakeWorker.instances[0]!.terminated).toBe(true);
    const next = renderer.render(big);
    FakeWorker.instances.at(-1)!.reply(okResult(2, "<p>again</p>"));
    await expect(next).resolves.toMatchObject({ html: "<p>again</p>" });
  });

  it("cancel() with nothing in flight does not terminate or throw; small renders keep working after dispose", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const renderer = createRenderer();
    renderer.cancel();
    renderer.dispose();
    await expect(renderer.render("# ok")).resolves.toMatchObject({
      html: expect.stringContaining("<h1"),
    });
  });

  it("a worker 'ok: false' answer rejects with a plain Error (UI shows the failure banner)", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const renderer = createRenderer();
    const job = renderer.render("x".repeat(WORKER_THRESHOLD + 1)).catch((e: unknown) => e);
    FakeWorker.instances[0]!.reply({ id: 1, ok: false });
    const error = await job;
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(RenderCancelled);
  });

  // BUG-4: render() is not async, so a Worker constructor that throws (blocked by CSP, module workers
  // unsupported) throws synchronously out of useMarkdownRender's effect instead of rejecting or
  // falling back to the main thread, which crashes the whole tool for documents over 200,000 chars.
  it("falls back or rejects (never throws synchronously) when the Worker cannot be created (BUG-4)", async () => {
    FakeWorker.failOnConstruct = true;
    vi.stubGlobal("Worker", FakeWorker);
    const renderer = createRenderer();
    let thrown: unknown;
    let promise: Promise<unknown> | undefined;
    try {
      promise = renderer.render("x".repeat(WORKER_THRESHOLD + 1));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeUndefined();
    await promise!.catch(() => {});
  });
});

describe("QA: file decoding (PRD 3.10 / 9.4: UTF-8 with or without BOM, empty, > 5 MB)", () => {
  const bytes = (...values: number[]) => Uint8Array.of(...values).buffer;
  const enc = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;

  it("size boundary: exactly 5 MB is accepted, one byte more is refused", () => {
    expect(checkFileSize(MAX_FILE_BYTES).ok).toBe(true);
    expect(checkFileSize(MAX_FILE_BYTES + 1).ok).toBe(false);
    expect(checkFileSize(0).ok).toBe(true);
    expect(decodeMarkdownFile(new ArrayBuffer(MAX_FILE_BYTES + 1)).ok).toBe(false);
  });

  it("a 5 MB file of text decodes completely", () => {
    const result = decodeMarkdownFile(enc("a".repeat(MAX_FILE_BYTES)));
    expect(result.ok && result.value.length).toBe(MAX_FILE_BYTES);
  });

  it("BOM: stripped once, a second BOM is content, BOM-only file is empty text", () => {
    const bom = [0xef, 0xbb, 0xbf];
    expect(decodeMarkdownFile(bytes(...bom, 0x23, 0x20, 0x61))).toEqual({ ok: true, value: "# a" });
    const double = decodeMarkdownFile(bytes(...bom, ...bom, 0x61));
    expect(double.ok && double.value).toBe("﻿a");
    expect(decodeMarkdownFile(bytes(...bom))).toEqual({ ok: true, value: "" });
  });

  it("empty file is valid and yields an empty document", () => {
    expect(decodeMarkdownFile(new ArrayBuffer(0))).toEqual({ ok: true, value: "" });
  });

  it("rejects invalid UTF-8 of every flavour instead of showing replacement characters", () => {
    const invalid: Array<[string, number[]]> = [
      ["lone continuation", [0x80]],
      ["truncated sequence", [0xe2, 0x82]],
      ["overlong NUL", [0xc0, 0x80]],
      ["surrogate half", [0xed, 0xa0, 0x80]],
      ["above U+10FFFF", [0xf4, 0x90, 0x80, 0x80]],
      ["Latin-1 e-acute", [0x63, 0x61, 0x66, 0xe9]],
      ["UTF-16 LE with BOM", [0xff, 0xfe, 0x61, 0x00]],
    ];
    for (const [name, data] of invalid) {
      expect(decodeMarkdownFile(bytes(...data)).ok, name).toBe(false);
    }
  });

  it("rejects NUL anywhere, even in otherwise valid UTF-8", () => {
    expect(decodeMarkdownFile(bytes(0x61, 0x00, 0x62)).ok).toBe(false);
    expect(decodeMarkdownFile(bytes(0x00)).ok).toBe(false);
  });

  it("keeps Vietnamese, CJK, emoji, CRLF and tabs exactly", () => {
    const text = "# Tiếng Việt\r\n\t日本語 😀\r\n";
    expect(decodeMarkdownFile(enc(text))).toEqual({ ok: true, value: text });
  });

  it("the failure messages are user-facing text with the limit or format named", () => {
    const big = decodeMarkdownFile(new ArrayBuffer(MAX_FILE_BYTES + 1));
    const bin = decodeMarkdownFile(bytes(0xff));
    expect(!big.ok && big.error.message).toContain("5 MB");
    expect(!bin.ok && bin.error.message).toContain("UTF-8");
  });
});
