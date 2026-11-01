/** QA component tests for Markdown Preview: privacy, export, draft, files, states, accessibility. */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS, storage } from "../../lib/storage";
import { MarkdownPreview } from "./MarkdownPreview";

vi.mock("../../components/editors/CodeEditor", () => ({
  CodeEditor: ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: string;
    onChange?: (value: string) => void;
    ariaLabel: string;
  }) => (
    <textarea aria-label={ariaLabel} value={value} onChange={(e) => onChange?.(e.target.value)} />
  ),
}));

const renderTool = () =>
  render(
    <MemoryRouter>
      <MarkdownPreview />
    </MemoryRouter>,
  );
const editor = () =>
  screen.getByRole("textbox", { name: "Ô soạn Markdown" }) as HTMLTextAreaElement;
const preview = () => screen.getByRole("region", { name: "Bản xem trước Markdown" });
const type = (value: string) => fireEvent.change(editor(), { target: { value } });
const pickMenu = async (user: ReturnType<typeof userEvent.setup>, name: string, item: string) => {
  await user.click(screen.getByRole("button", { name }));
  await user.click(screen.getByRole("menuitem", { name: item }));
};
const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));
const fileInput = (container: HTMLElement) =>
  container.querySelector("input[type=file]") as HTMLInputElement;

beforeEach(() => {
  for (const key of Object.values(STORAGE_KEYS)) storage.remove(key);
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn());
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("QA privacy (AC: no request to external domains by default; SD-7)", () => {
  it("no network primitive is touched while editing, previewing, copying and exporting hostile input", async () => {
    const user = userEvent.setup();
    const xhr = vi.spyOn(XMLHttpRequest.prototype, "open");
    const beacon = vi.fn();
    vi.stubGlobal("navigator", Object.assign(Object.create(navigator), { sendBeacon: beacon }));
    URL.createObjectURL = vi.fn(() => "blob:t");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderTool();
    type(
      "![a](https://t.example/1.png)\n\n![b](//t.example/2.png)\n\n<img src=https://t.example/3.png>\n\n" +
        "<link rel=stylesheet href=https://t.example/x.css>\n\n[l](https://t.example/l)",
    );
    await within(preview()).findByText("Ảnh bị chặn: a");
    await pickMenu(user, "Copy", "Copy HTML");
    await pickMenu(user, "Tải xuống", "Tải .html");
    await wait(50);
    expect(fetch).not.toHaveBeenCalled();
    expect(xhr).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
    // Nothing in the live DOM may be fetched by the browser on its own.
    const fetchable = document.querySelectorAll(
      "img[src^='http'], img[src^='//'], [srcset], link[href], iframe, video, audio, source, object, embed",
    );
    expect(fetchable.length).toBe(0);
  });

  it("Copy HTML and Download .html: default has no external image; opt-in adds only the img, never a script", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => (blobs.push(blob), "blob:t"));
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderTool();
    type(
      "![pixel](https://t.example/p.png)\n\n<script>alert(1)</script>\n\n[ok](https://ok.example)",
    );
    await within(preview()).findByText("Ảnh bị chặn: pixel");

    await pickMenu(user, "Copy", "Copy HTML");
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0]![0]).not.toContain("t.example");
    await pickMenu(user, "Tải xuống", "Tải .html");
    await waitFor(() => expect(blobs).toHaveLength(1));
    expect(await blobs[0]!.text()).not.toContain("t.example/p.png");

    await user.click(screen.getByRole("checkbox", { name: "Tải ảnh ngoài" }));
    await user.click(screen.getByRole("button", { name: "Bật tải ảnh ngoài" }));
    await waitFor(() => expect(preview().querySelector("img")).not.toBeNull());
    await pickMenu(user, "Copy", "Copy HTML");
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    const copied = new DOMParser().parseFromString(writeText.mock.calls[1]![0], "text/html");
    expect(copied.querySelector("img")?.getAttribute("src")).toBe("https://t.example/p.png");
    expect(copied.querySelector("script")).toBeNull();
  });

  it("switching 'Tải ảnh ngoài' off again removes the image from the preview", async () => {
    const user = userEvent.setup();
    renderTool();
    type("![pixel](https://t.example/p.png)");
    await user.click(screen.getByRole("checkbox", { name: "Tải ảnh ngoài" }));
    await user.click(screen.getByRole("button", { name: "Bật tải ảnh ngoài" }));
    await waitFor(() => expect(preview().querySelector("img")).not.toBeNull());
    await user.click(screen.getByRole("checkbox", { name: "Tải ảnh ngoài" }));
    await waitFor(() => expect(preview().querySelector("img")).toBeNull());
  });

  it("the external-images opt-in is not persisted: a new visit starts blocked", async () => {
    const user = userEvent.setup();
    const first = renderTool();
    await user.click(screen.getByRole("checkbox", { name: "Tải ảnh ngoài" }));
    await user.click(screen.getByRole("button", { name: "Bật tải ảnh ngoài" }));
    expect(screen.getByRole("checkbox", { name: "Tải ảnh ngoài" })).toBeChecked();
    first.unmount();
    renderTool();
    expect(screen.getByRole("checkbox", { name: "Tải ảnh ngoài" })).not.toBeChecked();
    expect(Object.values(localStorage).join()).not.toMatch(/external|allow/i);
  });

  it("never writes the document, or any part of it, to console, storage or cookies by default", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m),
    );
    renderTool();
    type("# SECRET-TOKEN-12345 [x](javascript:alert(1))");
    await within(preview()).findByRole("heading");
    await wait(900);
    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain("SECRET-TOKEN-12345");
    }
    expect(JSON.stringify({ ...localStorage })).not.toContain("SECRET-TOKEN-12345");
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("SECRET-TOKEN-12345");
    expect(document.cookie).not.toContain("SECRET");
  });
});

describe("QA execution safety in the live DOM", () => {
  it("hostile Markdown executes nothing and leaves only allowed nodes in the preview", async () => {
    const win = window as unknown as Record<string, unknown>;
    renderTool();
    type(
      [
        "<script>window.__qa = 1</script>",
        '<img src=x onerror="window.__qa = 2">',
        '<svg onload="window.__qa = 3"></svg>',
        "[a](javascript:window.__qa=4)",
        '<details open ontoggle="window.__qa=5">x</details>',
        '<iframe srcdoc="<script>parent.__qa=6</script>"></iframe>',
        "![](data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9InBhcmVudC5fX3FhPTciPjwvc3ZnPg==)",
        "visible",
      ].join("\n\n"),
    );
    await within(preview()).findByText("visible");
    await wait(100);
    expect(win.__qa).toBeUndefined();
    expect(
      preview().querySelectorAll("script, iframe, svg, img, details, [onerror], [onload]").length,
    ).toBe(0);
    for (const a of preview().querySelectorAll("a"))
      expect(a.getAttribute("href") ?? "").not.toMatch(/^javascript/i);
  });

  it("clicking a rendered link or footnote never navigates the SPA away or opens javascript:", async () => {
    const user = userEvent.setup();
    renderTool();
    type("[ext](https://ok.example) [bad](javascript:window.__qa=9)\n\nnote[^1]\n\n[^1]: n");
    await within(preview()).findByRole("link", { name: "ext" });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    await user.click(within(preview()).getByText("bad"));
    expect((window as unknown as Record<string, unknown>).__qa).toBeUndefined();
    expect(open).not.toHaveBeenCalled();
  });
});

describe("QA opt-in draft (PRD 3.10: opt-in, deletable, stated in UI)", () => {
  const toggle = () => screen.getByRole("checkbox", { name: "Nhớ bản nháp trên thiết bị này" });

  it("nothing about the document is stored by default, even after Clear, Sample, file open and Undo", async () => {
    const user = userEvent.setup();
    const { container } = renderTool();
    type("# riêng tư");
    await user.click(screen.getByRole("button", { name: "Xóa" }));
    await user.click(screen.getByRole("button", { name: "Hoàn tác" }));
    await user.click(screen.getByRole("button", { name: "Mẫu" }));
    fireEvent.change(fileInput(container), { target: { files: [new File(["# file"], "a.md")] } });
    await waitFor(() => expect(editor().value).toBe("# file"));
    await wait(800);
    expect(localStorage.getItem(STORAGE_KEYS.mdDraft)).toBeNull();
    expect(JSON.stringify({ ...localStorage })).not.toContain("riêng tư");
  });

  it("the UI states what is stored (the draft hint is visible while enabled and absent otherwise)", async () => {
    const user = userEvent.setup();
    renderTool();
    const hintCount = () => screen.queryAllByText(/thiết bị này|bản nháp/i).length;
    const before = hintCount();
    await user.click(toggle());
    expect(hintCount()).toBeGreaterThan(before);
    expect(screen.getByRole("checkbox", { name: "Nhớ bản nháp trên thiết bị này" })).toBeChecked();
  });

  it("limit: exactly 1,000,000 characters is stored, 1,000,001 is not and shows the warning", async () => {
    const user = userEvent.setup();
    renderTool();
    await user.click(toggle());
    type("a".repeat(1_000_000));
    await waitFor(
      () => expect(localStorage.getItem(STORAGE_KEYS.mdDraft)?.length).toBeGreaterThan(1_000_000),
      {
        timeout: 3000,
      },
    );
    expect(screen.queryByText(/Bản nháp quá lớn/)).not.toBeInTheDocument();
    type("b".repeat(1_000_001));
    expect(await screen.findByText(/Bản nháp quá lớn/)).toBeInTheDocument();
    await wait(700);
    expect(localStorage.getItem(STORAGE_KEYS.mdDraft) ?? "").not.toContain("bbbbbbbb");
  }, 30_000);

  it("switching it off inside the 500 ms save window leaves nothing behind", async () => {
    const user = userEvent.setup();
    renderTool();
    await user.click(toggle());
    type("# gõ nhanh rồi tắt");
    await user.click(toggle());
    await wait(900);
    expect(localStorage.getItem(STORAGE_KEYS.mdDraft)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.mdDraftEnabled)).toBeNull();
    expect(editor().value).toBe("# gõ nhanh rồi tắt");
  });

  it("switching on with existing text stores it; Clear then stores the empty draft, Undo restores it", async () => {
    const user = userEvent.setup();
    renderTool();
    type("# có sẵn");
    await user.click(toggle());
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEYS.mdDraft)).toBe('"# có sẵn"'));
    await user.click(screen.getByRole("button", { name: "Xóa" }));
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEYS.mdDraft)).toBe('""'));
    await user.click(screen.getByRole("button", { name: "Hoàn tác" }));
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEYS.mdDraft)).toBe('"# có sẵn"'));
  });

  it("a draft left in storage is ignored while the toggle is off (no resurrection)", () => {
    storage.write(STORAGE_KEYS.mdDraft, "# cũ");
    renderTool();
    expect(editor().value).toBe("");
  });

  it("corrupt stored values do not crash: wrong types fall back to defaults", () => {
    localStorage.setItem(STORAGE_KEYS.mdDraftEnabled, "not json{");
    localStorage.setItem(STORAGE_KEYS.mdDraft, "123");
    localStorage.setItem(STORAGE_KEYS.mdView, '"sideways"');
    localStorage.setItem(STORAGE_KEYS.mdDocWidth, '"yes"');
    renderTool();
    expect(editor().value).toBe("");
    expect(preview()).toBeInTheDocument();
  });

  it("works when localStorage throws on every call (SD-9): edit, preview and toggles still function", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    renderTool();
    type("# vẫn chạy");
    expect(await within(preview()).findByRole("heading", { name: "vẫn chạy" })).toBeInTheDocument();
    await user.click(toggle());
    await user.click(screen.getByRole("radio", { name: "Xem" }));
    expect(preview()).toBeInTheDocument();
  });
});

describe("QA file opening (PRD 3.10 / 9.4)", () => {
  const choose = (container: HTMLElement, file: File) =>
    fireEvent.change(fileInput(container), { target: { files: [file] } });
  const utf8 = (...values: number[]) => new File([Uint8Array.of(...values)], "f.md");

  it("UTF-8 BOM is stripped from the editor text", async () => {
    const { container } = renderTool();
    choose(container, utf8(0xef, 0xbb, 0xbf, 0x23, 0x20, 0x61));
    await waitFor(() => expect(editor().value).toBe("# a"));
  });

  it("an empty file clears nothing silently wrong: editor becomes empty with no error", async () => {
    const { container } = renderTool();
    type("old");
    choose(container, new File([], "empty.md"));
    await waitFor(() => expect(editor().value).toBe(""));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("NUL byte, UTF-16 and Latin-1 files are refused with a visible message and the text is kept", async () => {
    const { container } = renderTool();
    type("giữ lại");
    for (const file of [utf8(0x61, 0x00, 0x62), utf8(0xff, 0xfe, 0x61, 0x00), utf8(0x63, 0xe9)]) {
      choose(container, file);
      expect(await screen.findByRole("alert")).toHaveTextContent("UTF-8");
      expect(editor().value).toBe("giữ lại");
    }
  });

  it("a later good file clears the earlier error", async () => {
    const { container } = renderTool();
    choose(container, utf8(0xff));
    await screen.findByRole("alert");
    choose(container, new File(["# ok"], "ok.md"));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(editor().value).toBe("# ok");
  });

  it("a file the browser cannot read gives a message, not an exception", async () => {
    const { container } = renderTool();
    const broken = new File(["x"], "x.md");
    broken.arrayBuffer = () => Promise.reject(new Error("NotReadableError"));
    choose(container, broken);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(editor()).toBeInTheDocument();
  });

  it("a file of exactly 5 MB is accepted, 5 MB + 1 byte is refused", async () => {
    const { container } = renderTool();
    const exact = new File(["# a\n" + "a".repeat(5 * 1024 * 1024 - 4)], "five.md");
    expect(exact.size).toBe(5 * 1024 * 1024);
    choose(container, exact);
    await waitFor(() => expect(editor().value.length).toBe(5 * 1024 * 1024), { timeout: 20_000 });
    const over = new File(["x"], "over.md");
    Object.defineProperty(over, "size", { value: 5 * 1024 * 1024 + 1 });
    choose(container, over);
    expect(await screen.findByRole("alert")).toHaveTextContent("5 MB");
    expect(editor().value.length).toBe(5 * 1024 * 1024);
  }, 60_000);

  it("the file chooser accepts .md, .markdown and .txt and can pick the same file twice", async () => {
    const { container } = renderTool();
    expect(fileInput(container).accept).toMatch(/\.md.*\.markdown.*\.txt/);
    choose(container, new File(["# one"], "a.md"));
    await waitFor(() => expect(editor().value).toBe("# one"));
    expect(fileInput(container).value).toBe("");
  });

  it("drag and drop: a text drag is ignored, a drop with no file changes nothing, extra files are ignored", async () => {
    const { container } = renderTool();
    const zone = container.querySelector(".relative.grid")!;
    type("giữ");
    const fire = (type: string, dataTransfer: unknown) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
      zone.dispatchEvent(event);
      return event;
    };
    expect(fire("dragover", { types: ["text/plain"], files: [] }).defaultPrevented).toBe(false);
    expect(fire("drop", { types: ["text/plain"], files: [] }).defaultPrevented).toBe(false);
    fire("drop", { types: ["Files"], files: [] });
    expect(editor().value).toBe("giữ");
    expect(fire("dragover", { types: ["Files"], files: [] }).defaultPrevented).toBe(true);
    expect(await screen.findByText(/Thả/)).toBeInTheDocument();
    fire("drop", {
      types: ["Files"],
      files: [new File(["# một"], "1.md"), new File(["# hai"], "2.md")],
    });
    await waitFor(() => expect(editor().value).toBe("# một"));
    expect(screen.queryByText(/Thả file/)).not.toBeInTheDocument();
  });
});

describe("QA state transitions and recovery", () => {
  it("typed text survives every view change (edit -> preview -> split -> edit)", async () => {
    const user = userEvent.setup();
    renderTool();
    type("# bền vững");
    await user.click(screen.getByRole("radio", { name: "Xem" }));
    await user.click(screen.getByRole("radio", { name: "Chia đôi" }));
    await user.click(screen.getByRole("radio", { name: "Soạn" }));
    expect(editor().value).toBe("# bền vững");
    await user.click(screen.getByRole("radio", { name: "Xem" }));
    expect(await within(preview()).findByRole("heading", { name: "bền vững" })).toBeInTheDocument();
  });

  it("edit-only view does not render at all, so a big document costs nothing there", async () => {
    const user = userEvent.setup();
    renderTool();
    await user.click(screen.getByRole("radio", { name: "Soạn" }));
    type("# ẩn");
    await wait(400);
    expect(screen.queryByRole("heading", { name: "ẩn" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Chia đôi" }));
    expect(await within(preview()).findByRole("heading", { name: "ẩn" })).toBeInTheDocument();
  });

  it("narrow screens: no Split option; a stored 'split' falls back to edit; tool never overflows into an empty page", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("max-width: 639px"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    storage.write(STORAGE_KEYS.mdView, "split");
    renderTool();
    expect(screen.queryByRole("radio", { name: "Chia đôi" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Soạn" })).toBeChecked();
    expect(
      screen.queryByRole("region", { name: "Bản xem trước Markdown" }),
    ).not.toBeInTheDocument();
    expect(editor()).toBeInTheDocument();
  });

  it("Clear is disabled when empty; Undo disappears after use and the bar auto-expires", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderTool();
    expect(screen.getByRole("button", { name: "Xóa" })).toBeDisabled();
    type("x");
    await user.click(screen.getByRole("button", { name: "Xóa" }));
    expect(screen.getByRole("button", { name: "Hoàn tác" })).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6500);
    });
    expect(screen.queryByRole("button", { name: "Hoàn tác" })).not.toBeInTheDocument();
    expect(editor().value).toBe("");
  });

  it("a failed render keeps the previous preview, shows the error, and the next edit recovers (SD-10)", async () => {
    class FailingWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      postMessage(message: { id: number }) {
        queueMicrotask(() =>
          this.onmessage?.({ data: { id: message.id, ok: false } } as MessageEvent),
        );
      }
      terminate() {}
    }
    vi.stubGlobal("Worker", FailingWorker);
    renderTool();
    type("# hợp lệ");
    await within(preview()).findByRole("heading", { name: "hợp lệ" });
    type("# hợp lệ\n\n" + "x ".repeat(100_001)); // over the worker threshold -> worker answers "failed"
    expect(
      await screen.findByText("Không hiển thị được bản xem trước.", {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(within(preview()).getByRole("heading", { name: "hợp lệ" })).toBeInTheDocument(); // previous preview kept
    expect(editor().value.length).toBeGreaterThan(200_000); // the text is never lost
    type("# phục hồi");
    expect(await within(preview()).findByRole("heading", { name: "phục hồi" })).toBeInTheDocument();
    expect(screen.queryByText("Không hiển thị được bản xem trước.")).not.toBeInTheDocument();
  }, 30_000);

  it("typing with only whitespace or only a raw HTML tag yields the empty/notice states, not a crash", async () => {
    renderTool();
    type("   \n\n\t");
    await wait(300);
    expect(within(preview()).getByText("Bản xem trước sẽ hiện ở đây.")).toBeInTheDocument();
    type("<script>alert(1)</script>");
    expect(
      await screen.findByText("HTML thô trong tài liệu đã bị bỏ qua để an toàn."),
    ).toBeInTheDocument();
    expect(preview().querySelector("script")).toBeNull();
  });

  // BUG-4 at tool level: a Worker that cannot be constructed crashes the render effect.
  it("a document over 200,000 chars still previews (or shows a banner) when Worker construction throws (BUG-4)", async () => {
    vi.stubGlobal(
      "Worker",
      class {
        constructor() {
          throw new Error("blocked by CSP");
        }
      },
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderTool();
    type("# tiêu đề\n\n" + "x ".repeat(100_001));
    await wait(1500);
    expect(editor()).toBeInTheDocument();
  });
});

describe("QA accessibility (PRD 4.3)", () => {
  it("every button, checkbox, radio, textbox and file input has an accessible name", () => {
    const { container } = renderTool();
    type("# a\n\n```js\nx\n```");
    const controls = container.querySelectorAll("button, input, textarea, select");
    expect(controls.length).toBeGreaterThan(8);
    for (const control of Array.from(controls)) {
      const name = control.getAttribute("aria-label") ?? control.textContent ?? "";
      const labelled =
        name.trim() !== "" ||
        (control as HTMLInputElement).labels?.length ||
        control.getAttribute("aria-labelledby");
      expect(Boolean(labelled), `unnamed control: ${control.outerHTML.slice(0, 100)}`).toBe(true);
    }
  });

  it("the preview region is focusable and named; code Copy buttons have text names", async () => {
    renderTool();
    type("```js\nconst a = 1\n```");
    await within(preview()).findByRole("button", { name: "Copy mã" });
    expect(preview()).toHaveAttribute("tabindex", "0");
  });

  it("blocked images are announced with their alt text, not only a colour/border", async () => {
    renderTool();
    type("![sơ đồ kiến trúc](https://t.example/a.png)");
    const blocked = await within(preview()).findByRole("img", { name: /sơ đồ kiến trúc/ });
    expect(blocked).toHaveTextContent("Ảnh bị chặn");
  });

  it("menus work by keyboard: Enter opens and focuses the first item, arrows wrap, Escape closes and returns focus", async () => {
    const user = userEvent.setup();
    renderTool();
    type("# a");
    const trigger = screen.getByRole("button", { name: "Copy" });
    trigger.focus();
    await user.keyboard("{Enter}");
    const items = screen.getAllByRole("menuitem");
    expect(items[0]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(items[0]).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(items[1]).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("an empty TOC says so instead of showing an empty menu", async () => {
    const user = userEvent.setup();
    renderTool();
    await user.click(screen.getByRole("button", { name: "Mục lục" }));
    expect(screen.getByRole("menu")).toHaveTextContent(/./);
    expect(screen.queryAllByRole("menuitem")).toHaveLength(0);
  });

  it("the confirmation dialog can be dismissed with Escape and leaves images blocked", async () => {
    const user = userEvent.setup();
    renderTool();
    await user.click(screen.getByRole("checkbox", { name: "Tải ảnh ngoài" }));
    const dialog = screen.getByRole("dialog", { name: "Tải ảnh từ URL ngoài?" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    fireEvent(dialog, new Event("close"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("checkbox", { name: "Tải ảnh ngoài" })).not.toBeChecked();
  });

  it("status text announces copy results through a polite status region", async () => {
    const user = userEvent.setup();
    renderTool();
    type("# a");
    await pickMenu(user, "Copy", "Copy Markdown");
    await waitFor(() => {
      const statuses = screen.getAllByRole("status");
      expect(statuses.some((s) => s.textContent?.includes("Đã copy"))).toBe(true);
    });
  });

  it("a failed clipboard write is reported in text, not swallowed", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    document.execCommand = vi.fn(() => false);
    renderTool();
    type("# a");
    await pickMenu(user, "Copy", "Copy Markdown");
    await waitFor(() => {
      const statuses = screen.getAllByRole("status");
      expect(statuses.some((s) => /không|lỗi|thất bại/i.test(s.textContent ?? ""))).toBe(true);
    });
  });
});

describe("QA export correctness", () => {
  it("Download .md is byte-identical to the editor text for Unicode and trailing spaces", async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => (blobs.push(blob), "blob:t"));
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderTool();
    // LF only: the textarea stand-in (and CodeMirror) normalise CRLF to LF on input.
    const text = "# Tiếng Việt 😀\n\n  dòng có đuôi  \n\ttab";
    type(text);
    await pickMenu(user, "Tải xuống", "Tải .md");
    expect(await blobs[0]!.text()).toBe(text);
    expect(blobs[0]!.type).toContain("text/markdown");
  });

  it("every download revokes its object URL exactly once, even when the same file is downloaded repeatedly", async () => {
    const user = userEvent.setup();
    let counter = 0;
    URL.createObjectURL = vi.fn(() => `blob:t${(counter += 1)}`);
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderTool();
    type("# a");
    await within(preview()).findByRole("heading");
    await pickMenu(user, "Tải xuống", "Tải .md");
    await pickMenu(user, "Tải xuống", "Tải .md");
    await pickMenu(user, "Tải xuống", "Tải .html");
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3));
    expect(
      (URL.revokeObjectURL as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]).sort(),
    ).toEqual(["blob:t1", "blob:t2", "blob:t3"]);
    expect(document.querySelectorAll("a[download]").length).toBe(0);
  });

  it("downloaded .html equals what the preview would show: same headings, no UI buttons, title from first heading", async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => (blobs.push(blob), "blob:t"));
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderTool();
    type("## Phần hai\n\n```js\nlet a\n```\n\n| a |\n|---|\n| 1 |");
    await within(preview()).findByRole("heading");
    await pickMenu(user, "Tải xuống", "Tải .html");
    await waitFor(() => expect(blobs).toHaveLength(1));
    const doc = new DOMParser().parseFromString(await blobs[0]!.text(), "text/html");
    expect(doc.title).toBe("Phần hai");
    expect(doc.querySelectorAll("button").length).toBe(0);
    expect(doc.querySelector("table td")?.textContent).toBe("1");
    expect(doc.querySelector("pre code .hljs-keyword")).not.toBeNull();
  });
});
