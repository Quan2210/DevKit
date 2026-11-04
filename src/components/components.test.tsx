import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLatestWins } from "../lib/async/latestWins";
import { filterTools, groupTools } from "../lib/toolSearch";
import type { ToolMeta } from "../registry/tools.meta";
import { CopyButton } from "./common/CopyButton";
import { DeviceStatus } from "./common/DeviceStatus";
import { ErrorBanner } from "./common/ErrorBanner";
import { Segmented } from "./common/Segmented";
import { ToolList } from "./common/ToolList";
import { UndoBar } from "./common/UndoBar";
import { SidebarNav } from "./layout/SidebarNav";
import { ToolShell } from "./layout/ToolShell";

const tool = (overrides: Partial<ToolMeta>): ToolMeta => ({
  id: "json",
  slug: "json-formatter",
  group: "data",
  titleKey: "tool.json.title",
  descriptionKey: "tool.json.description",
  keywords: ["json"],
  priority: "P0",
  status: "ready",
  icon: "braces",
  routeFile: "routes/tools/json-formatter.tsx",
  ...overrides,
});
const tools = [
  tool({}),
  tool({
    id: "uuid",
    slug: "uuid-generator",
    group: "generator",
    titleKey: "tool.uuid.title",
    descriptionKey: "tool.uuid.description",
    keywords: ["uuid", "guid"],
    icon: "fingerprint",
  }),
];

describe("tool search", () => {
  it("matches title, description and keywords case-insensitively", () => {
    expect(filterTools(tools, "GUID").map((t) => t.id)).toEqual(["uuid"]);
    expect(filterTools(tools, "kiểm tra cú pháp").map((t) => t.id)).toEqual(["json"]);
    expect(filterTools(tools, "")).toHaveLength(2);
    expect(filterTools(tools, "zzz")).toHaveLength(0);
  });

  it("groups in registry order and drops empty groups", () => {
    expect(groupTools(tools).map((g) => g.id)).toEqual(["data", "generator"]);
  });
});

describe("latest wins", () => {
  it("only accepts the most recent request", () => {
    const guard = createLatestWins();
    const first = guard.begin();
    const second = guard.begin();
    expect(guard.isLatest(first)).toBe(false);
    expect(guard.isLatest(second)).toBe(true);
  });
});

describe("CopyButton", () => {
  it("copies the text and changes its own label", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(<CopyButton text="hello" />);
    await user.click(screen.getByRole("button", { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith("hello");
    expect(screen.getAllByText("Đã copy").length).toBeGreaterThan(0);
  });

  it("shows guidance when the clipboard is refused", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    document.execCommand = vi.fn().mockReturnValue(false);
    render(<CopyButton text="hello" />);
    await user.click(screen.getByRole("button", { name: /copy/i }));
    expect(screen.getAllByText(/Không copy được/).length).toBeGreaterThan(0);
  });
});

describe("UndoBar", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("expires after the duration and calls undo on request", () => {
    const onExpire = vi.fn();
    const onUndo = vi.fn();
    render(<UndoBar message="Đã xóa." onUndo={onUndo} onExpire={onExpire} durationMs={6000} />);
    act(() => void vi.advanceTimersByTime(5999));
    expect(onExpire).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(2));
    expect(onExpire).toHaveBeenCalledTimes(1);
    screen.getByRole("button", { name: "Hoàn tác" }).click();
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});

describe("Segmented", () => {
  it("moves selection with arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Segmented
        label="Chế độ"
        value="a"
        onChange={onChange}
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
          { value: "c", label: "C" },
        ]}
      />,
    );
    screen.getByRole("radio", { name: "A" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("b");
    await user.keyboard("{End}");
    expect(onChange).toHaveBeenLastCalledWith("c");
    expect(screen.getByRole("radio", { name: "A" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "B" })).toHaveAttribute("tabindex", "-1");
  });
});

describe("ErrorBanner", () => {
  it("announces the error and offers a jump link", async () => {
    const user = userEvent.setup();
    const onJump = vi.fn();
    render(
      <ErrorBanner
        title="JSON không hợp lệ: thiếu dấu ngoặc đóng."
        locationLabel="Dòng 12, cột 5"
        onJump={onJump}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("thiếu dấu ngoặc đóng");
    await user.click(screen.getByRole("button", { name: "Dòng 12, cột 5" }));
    expect(onJump).toHaveBeenCalled();
  });
});

describe("DeviceStatus", () => {
  it("states local processing by default and explains how to verify", async () => {
    const user = userEvent.setup();
    render(<DeviceStatus />);
    await user.click(screen.getByRole("button", { name: /Xử lý trên thiết bị/ }));
    expect(screen.getByText(/Tự kiểm chứng/)).toBeInTheDocument();
  });

  it("switches to a warning when external requests are enabled", () => {
    render(<DeviceStatus externalRequestsEnabled />);
    expect(screen.getByRole("status")).toHaveTextContent("Ảnh ngoài đang bật");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<DeviceStatus />);
    const trigger = screen.getByRole("button", { name: /Xử lý trên thiết bị/ });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByText(/Tự kiểm chứng/)).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe("navigation", () => {
  const inRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

  it("ToolList renders grouped links built from the registry data (SD-6)", () => {
    inRouter(<ToolList tools={tools} label="Danh sách công cụ" />);
    expect(screen.getByRole("link", { name: /JSON Formatter/ })).toHaveAttribute(
      "href",
      "/tools/json-formatter",
    );
    expect(screen.getByRole("heading", { name: "Dữ liệu" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Trình tạo" })).toBeInTheDocument();
  });

  it("SidebarNav filters by search and reports an empty registry", async () => {
    const user = userEvent.setup();
    inRouter(<SidebarNav tools={tools} />);
    await user.type(screen.getByRole("searchbox", { name: "Tìm công cụ" }), "guid");
    expect(screen.queryByRole("link", { name: /JSON Formatter/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /UUID Generator/ })).toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox", { name: "Tìm công cụ" }));
    await user.type(screen.getByRole("searchbox", { name: "Tìm công cụ" }), "zzz");
    expect(screen.getByRole("status")).toHaveTextContent("Không có công cụ nào khớp “zzz”");
  });

  it("SidebarNav says so when nothing is released yet", () => {
    inRouter(<SidebarNav tools={[]} />);
    expect(screen.getByText("Chưa có công cụ nào được phát hành.")).toBeInTheDocument();
  });
});

describe("ToolShell", () => {
  it("renders the page template with one h1, toolbar, status and guide", () => {
    render(
      <MemoryRouter>
        <ToolShell
          tool={tools[0]!}
          toolbar={<button type="button">Format</button>}
          status={<span>Hợp lệ</span>}
          guide={[
            { type: "h2", text: "Cách dùng" },
            { type: "p", text: "Dán JSON vào ô nhập." },
            { type: "ul", items: ["Một", "Hai"] },
          ]}
        >
          <div>workspace</div>
        </ToolShell>
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("JSON Formatter");
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
    expect(screen.getByText("workspace")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Xử lý trên thiết bị/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cách dùng" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(2);
  });
});
