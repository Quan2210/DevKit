import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS, storage } from "../../lib/storage";
import { MarkdownPreview } from "./MarkdownPreview";

// CodeMirror needs real layout; the pipeline and the rest of the tool are real.
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
const menu = async (user: ReturnType<typeof userEvent.setup>, name: string, item: string) => {
  await user.click(screen.getByRole("button", { name }));
  await user.click(screen.getByRole("menuitem", { name: item }));
};

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

describe("preview", () => {
  it("renders Markdown as you type, with an empty state first", async () => {
    renderTool();
    expect(within(preview()).getByText("Bản xem trước sẽ hiện ở đây.")).toBeInTheDocument();
    type("# Xin chào\n\n**đậm** và `mã`");
    expect(
      await within(preview()).findByRole("heading", { name: "Xin chào", level: 1 }),
    ).toBeInTheDocument();
    expect(within(preview()).getByText("đậm").tagName).toBe("STRONG");
  });

  it("the sample button fills the editor and the preview", async () => {
    const user = userEvent.setup();
    renderTool();
    await user.click(within(preview()).getByRole("button", { name: "Chèn nội dung mẫu" }));
    expect(editor().value).toContain("Xin chào KunKit");
    expect(await within(preview()).findByRole("table")).toBeInTheDocument();
  });

  it("never executes or shows active content, and says raw HTML was dropped", async () => {
    renderTool();
    type(
      '<script>window.__pwned = 1</script>\n\n<img src=x onerror="window.__pwned = 2">\n\n[x](javascript:window.__pwned=3)\n\nsafe text',
    );
    await within(preview()).findByText("safe text");
    expect(preview().querySelector("script, img, iframe")).toBeNull();
    expect(preview().innerHTML).not.toMatch(/onerror|javascript:/i);
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
    expect(
      screen.getByText("HTML thô trong tài liệu đã bị bỏ qua để an toàn."),
    ).toBeInTheDocument();
  });

  it("highlights code and adds a working Copy button to each code block", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    renderTool();
    type("```js\nconst a = 1;\n```");
    const button = await within(preview()).findByRole("button", { name: "Copy mã" });
    expect(preview().querySelector(".hljs-keyword")).not.toBeNull();
    await user.click(button);
    expect(writeText).toHaveBeenLastCalledWith("const a = 1;\n");
  });

  it("lists headings in a table of contents and scrolls to the chosen one", async () => {
    const user = userEvent.setup();
    renderTool();
    type("# Một\n\n## Hai\n\n## Ba");
    await within(preview()).findByRole("heading", { name: "Một" });
    await user.click(screen.getByRole("button", { name: "Mục lục" }));
    const items = screen.getAllByRole("menuitem").map((item) => item.textContent);
    expect(items).toEqual(["Một", "Hai", "Ba"]);
    await user.click(screen.getByRole("menuitem", { name: "Hai" }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("shows word, character and reading-time statistics", async () => {
    renderTool();
    type("một hai ba bốn năm");
    expect(await screen.findByText("5 từ")).toBeInTheDocument();
    expect(screen.getByText("18 ký tự")).toBeInTheDocument();
    expect(screen.getByText("khoảng 1 phút đọc")).toBeInTheDocument();
  });
});

describe("privacy: external images (SD-7)", () => {
  it("blocks them by default and makes no request", async () => {
    renderTool();
    type("![pixel](https://tracker.example/p.png)");
    expect(await within(preview()).findByText("Ảnh bị chặn: pixel")).toBeInTheDocument();
    expect(preview().querySelector("img")).toBeNull();
    expect(preview().innerHTML).not.toContain("tracker.example");
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Xử lý trên thiết bị/ })).toBeInTheDocument();
  });

  it("asks for confirmation, then loads images and turns the device indicator into a warning", async () => {
    const user = userEvent.setup();
    renderTool();
    type("![pixel](https://img.example/p.png)");
    await within(preview()).findByText("Ảnh bị chặn: pixel");

    await user.click(screen.getByRole("checkbox", { name: "Tải ảnh ngoài" }));
    expect(screen.getByRole("dialog", { name: "Tải ảnh từ URL ngoài?" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Tải ảnh ngoài" })).not.toBeChecked(); // not yet

    await user.click(screen.getByRole("button", { name: "Bật tải ảnh ngoài" }));
    await waitFor(() => expect(preview().querySelector("img")).not.toBeNull());
    expect(preview().querySelector("img")).toHaveAttribute("src", "https://img.example/p.png");
    expect(screen.getByText(/Ảnh ngoài đang bật/)).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Tải ảnh ngoài" }));
    await within(preview()).findByText("Ảnh bị chặn: pixel");
  });

  it("cancelling the confirmation leaves images blocked", async () => {
    const user = userEvent.setup();
    renderTool();
    await user.click(screen.getByRole("checkbox", { name: "Tải ảnh ngoài" }));
    await user.click(screen.getByRole("button", { name: "Hủy" }));
    expect(screen.getByRole("checkbox", { name: "Tải ảnh ngoài" })).not.toBeChecked();
  });
});

describe("views and preferences", () => {
  it("switches between edit, split and preview and remembers the choice", async () => {
    const user = userEvent.setup();
    renderTool();
    expect(editor()).toBeInTheDocument();
    expect(preview()).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Soạn" }));
    expect(
      screen.queryByRole("region", { name: "Bản xem trước Markdown" }),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.mdView)).toBe('"edit"');

    await user.click(screen.getByRole("radio", { name: "Xem" }));
    expect(screen.queryByRole("textbox", { name: "Ô soạn Markdown" })).not.toBeInTheDocument();
    expect(preview()).toBeInTheDocument();
  });

  it("restores the saved view on the next visit", () => {
    storage.write(STORAGE_KEYS.mdView, "preview");
    renderTool();
    expect(screen.queryByRole("textbox", { name: "Ô soạn Markdown" })).not.toBeInTheDocument();
  });

  it("document width toggles a narrow reading column and is remembered", async () => {
    const user = userEvent.setup();
    renderTool();
    type("# Tiêu đề");
    await within(preview()).findByRole("heading");
    expect(preview().querySelector(".md-prose")).not.toHaveClass("max-w-[75ch]");
    await user.click(screen.getByRole("checkbox", { name: "Chiều rộng tài liệu" }));
    expect(preview().querySelector(".md-prose")).toHaveClass("max-w-[75ch]");
    expect(localStorage.getItem(STORAGE_KEYS.mdDocWidth)).toBe("true");
  });

  it("shows the privacy banner once and stays dismissed", async () => {
    const user = userEvent.setup();
    const first = renderTool();
    expect(
      screen.getByText(
        "Nội dung chỉ được xử lý trên trình duyệt. Ảnh từ URL ngoài bị chặn để tránh gửi request ra ngoài.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Đã hiểu" }));
    expect(
      screen.queryByText(
        "Nội dung chỉ được xử lý trên trình duyệt. Ảnh từ URL ngoài bị chặn để tránh gửi request ra ngoài.",
      ),
    ).not.toBeInTheDocument();
    first.unmount();
    renderTool();
    expect(
      screen.queryByText(
        "Nội dung chỉ được xử lý trên trình duyệt. Ảnh từ URL ngoài bị chặn để tránh gửi request ra ngoài.",
      ),
    ).not.toBeInTheDocument();
  });
});

describe("opt-in draft (PRD 3.10, plan O5)", () => {
  it("stores nothing by default", async () => {
    renderTool();
    type("# bí mật");
    await act(() => new Promise((resolve) => setTimeout(resolve, 700)));
    expect(localStorage.getItem(STORAGE_KEYS.mdDraft)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.mdDraftEnabled)).toBeNull();
  });

  it("saves after a pause once enabled, restores on the next visit, and forgets when switched off", async () => {
    const user = userEvent.setup();
    const first = renderTool();
    type("# bản nháp");
    await user.click(screen.getByRole("checkbox", { name: "Nhớ bản nháp trên thiết bị này" }));
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEYS.mdDraft)).toBe('"# bản nháp"'));
    type("# bản nháp mới");
    await waitFor(() =>
      expect(localStorage.getItem(STORAGE_KEYS.mdDraft)).toBe('"# bản nháp mới"'),
    );

    first.unmount();
    renderTool();
    expect(editor().value).toBe("# bản nháp mới");

    await user.click(screen.getByRole("checkbox", { name: "Nhớ bản nháp trên thiết bị này" }));
    expect(localStorage.getItem(STORAGE_KEYS.mdDraft)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.mdDraftEnabled)).toBeNull();
    expect(editor().value).toBe("# bản nháp mới"); // what is on screen stays
  });

  it("does not store a draft over 1 MB and warns", async () => {
    const user = userEvent.setup();
    renderTool();
    await user.click(screen.getByRole("checkbox", { name: "Nhớ bản nháp trên thiết bị này" }));
    type("a".repeat(1_000_001));
    expect(await screen.findByText(/Bản nháp quá lớn/)).toBeInTheDocument();
    await act(() => new Promise((resolve) => setTimeout(resolve, 700)));
    expect(localStorage.getItem(STORAGE_KEYS.mdDraft) ?? "").not.toContain("aaaaaaaaaa");
  });
});

describe("files", () => {
  const fileInput = (container: HTMLElement) =>
    container.querySelector("input[type=file]") as HTMLInputElement;
  const choose = (container: HTMLElement, file: File) =>
    fireEvent.change(fileInput(container), { target: { files: [file] } });

  it("opens a Markdown file from disk into the editor", async () => {
    const { container } = renderTool();
    choose(container, new File(["# Từ file\n\nnội dung"], "a.md", { type: "text/markdown" }));
    await waitFor(() => expect(editor().value).toBe("# Từ file\n\nnội dung"));
  });

  it("rejects a file over 5 MB without reading it", async () => {
    const { container } = renderTool();
    const big = new File(["x"], "big.md");
    Object.defineProperty(big, "size", { value: 5 * 1024 * 1024 + 1 });
    choose(container, big);
    expect(await screen.findByRole("alert")).toHaveTextContent("5 MB");
    expect(editor().value).toBe("");
  });

  it("rejects non-text files and keeps the current content", async () => {
    const { container } = renderTool();
    type("giữ nguyên");
    choose(container, new File([Uint8Array.of(0xff, 0xfe, 0x00)], "bin.md"));
    expect(await screen.findByRole("alert")).toHaveTextContent("UTF-8");
    expect(editor().value).toBe("giữ nguyên");
  });

  it("accepts a dropped file", async () => {
    const { container } = renderTool();
    const zone = container.querySelector(".relative.grid")!;
    const file = new File(["# Thả"], "d.md");
    const drop = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(drop, "dataTransfer", { value: { types: ["Files"], files: [file] } });
    zone.dispatchEvent(drop);
    await waitFor(() => expect(editor().value).toBe("# Thả"));
  });
});

describe("copy, download and clear", () => {
  it("copies the Markdown source and the sanitized HTML", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    renderTool();
    type("# Tiêu đề\n\n<script>alert(1)</script>");
    await within(preview()).findByRole("heading");

    await menu(user, "Copy", "Copy Markdown");
    expect(writeText).toHaveBeenLastCalledWith("# Tiêu đề\n\n<script>alert(1)</script>");

    await menu(user, "Copy", "Copy HTML");
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    const html = writeText.mock.calls.at(-1)![0];
    expect(html).toContain("<h1");
    expect(html.toLowerCase()).not.toContain("<script");
  });

  it("downloads .md and a standalone .html with no script, and revokes the object URL", async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => (blobs.push(blob), "blob:test"));
    URL.revokeObjectURL = vi.fn();
    const clicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(this.download);
    });
    renderTool();
    type("# Tải về\n\n<script>alert(1)</script>");
    await within(preview()).findByRole("heading");

    await menu(user, "Tải xuống", "Tải .md");
    expect(clicks).toContain("document.md");
    expect(await blobs[0]!.text()).toBe("# Tải về\n\n<script>alert(1)</script>");

    await menu(user, "Tải xuống", "Tải .html");
    await waitFor(() => expect(clicks).toContain("document.html"));
    const html = await blobs[1]!.text();
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<title>Tải về</title>");
    expect(html.toLowerCase()).not.toContain("<script");
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test"));
  });

  it("Copy and Download are disabled for an empty document", () => {
    renderTool();
    expect(screen.getByRole("button", { name: "Copy" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Tải xuống" })).toBeDisabled();
  });

  it("Clear offers Undo", async () => {
    const user = userEvent.setup();
    renderTool();
    type("# giữ lại");
    await user.click(screen.getByRole("button", { name: "Xóa" }));
    expect(editor().value).toBe("");
    await user.click(screen.getByRole("button", { name: "Hoàn tác" }));
    expect(editor().value).toBe("# giữ lại");
  });
});
