import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DiffEditorProps, DiffReport } from "../../components/editors/DiffEditor";
import { TextCompare } from "./TextCompare";

// CodeMirror needs real layout; its behaviour is covered in the browser. The input editors are textareas
// here, and the diff editor is a stub that records what it was given and reports a canned summary.
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
    <textarea
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

let lastProps: DiffEditorProps | null = null;
let nextReport: DiffReport = { total: 2, added: 1, removed: 0, changed: 1, precise: true };
const prev = vi.fn();
const next = vi.fn();

vi.mock("../../components/editors/DiffEditor", async () => {
  const React = await import("react");
  return {
    DiffEditor: ({
      ref,
      ...props
    }: DiffEditorProps & { ref?: React.Ref<{ next(): void; prev(): void; focus(): void }> }) => {
      lastProps = props;
      React.useImperativeHandle(ref, () => ({ next, prev, focus: () => {} }));
      useEffect(() => props.onSummary?.(nextReport), [props]);
      return (
        <div data-testid="diff">
          <button onClick={() => props.onChange("modified", "edited")}>edit-modified</button>
        </div>
      );
    },
  };
});

const setup = () =>
  render(
    <MemoryRouter>
      <TextCompare />
    </MemoryRouter>,
  );
const box = (name: "Văn bản gốc" | "Văn bản đã sửa") =>
  screen.getByRole("textbox", { name }) as HTMLTextAreaElement;
const type = (name: "Văn bản gốc" | "Văn bản đã sửa", value: string) =>
  fireEvent.change(box(name), { target: { value } });
const compare = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "So sánh" }));

beforeEach(() => {
  lastProps = null;
  nextReport = { total: 2, added: 1, removed: 0, changed: 1, precise: true };
  prev.mockClear();
  next.mockClear();
});

describe("Text Compare input step", () => {
  it("starts with two empty editors and a Compare button", () => {
    setup();
    expect(box("Văn bản gốc").value).toBe("");
    expect(box("Văn bản đã sửa").value).toBe("");
    expect(screen.getByRole("button", { name: "So sánh" })).toBeInTheDocument();
    expect(screen.queryByTestId("diff")).not.toBeInTheDocument();
  });

  it("fills both sides with the sample", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Mẫu" }));
    expect(box("Văn bản gốc").value).toContain("Xin chào DevKit");
    expect(box("Văn bản đã sửa").value).toContain("Không gửi dữ liệu đi đâu");
  });

  it("swaps the two texts", async () => {
    const user = userEvent.setup();
    setup();
    type("Văn bản gốc", "left");
    type("Văn bản đã sửa", "right");
    await user.click(screen.getByRole("button", { name: "Đổi hai bên" }));
    expect(box("Văn bản gốc").value).toBe("right");
    expect(box("Văn bản đã sửa").value).toBe("left");
  });

  it("clears one side without touching the other", async () => {
    const user = userEvent.setup();
    setup();
    type("Văn bản gốc", "left");
    type("Văn bản đã sửa", "right");
    await user.click(
      within(screen.getByRole("region", { name: "Văn bản gốc" })).getByRole("button", {
        name: "Xóa",
      }),
    );
    expect(box("Văn bản gốc").value).toBe("");
    expect(box("Văn bản đã sửa").value).toBe("right");
  });

  it("shows the character count of each side", () => {
    setup();
    type("Văn bản gốc", "abc");
    expect(screen.getByText("Văn bản gốc: 3 ký tự")).toBeInTheDocument();
    expect(screen.getByText("Văn bản đã sửa: 0 ký tự")).toBeInTheDocument();
  });

  it("compares with Ctrl+Enter", async () => {
    const user = userEvent.setup();
    setup();
    type("Văn bản gốc", "a");
    await user.click(box("Văn bản gốc"));
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(await screen.findByTestId("diff")).toBeInTheDocument();
  });
});

describe("opening a file", () => {
  const upload = (name: string, file: File) =>
    fireEvent.change(screen.getByLabelText(`Mở tệp cho ${name}`, { selector: "input" }), {
      target: { files: [file] },
    });

  it("loads the file and normalises CRLF line endings", async () => {
    setup();
    upload("Văn bản gốc", new File(["a\r\nb\r\n"], "a.txt", { type: "text/plain" }));
    await waitFor(() => expect(box("Văn bản gốc").value).toBe("a\nb\n"));
  });

  it("refuses a binary file and keeps what was typed", async () => {
    setup();
    type("Văn bản gốc", "keep me");
    upload("Văn bản gốc", new File([new Uint8Array([97, 0, 98])], "bin.dat"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Tệp không phải văn bản UTF-8.");
    expect(box("Văn bản gốc").value).toBe("keep me");
  });
});

describe("Text Compare result step", () => {
  const open = async (user: ReturnType<typeof userEvent.setup>) => {
    setup();
    type("Văn bản gốc", "one\ntwo");
    type("Văn bản đã sửa", "one\nthree");
    await compare(user);
    return screen.findByTestId("diff");
  };

  it("hands both texts to the diff editor, split on a wide screen by default", async () => {
    const user = userEvent.setup();
    await open(user);
    expect(lastProps).toMatchObject({
      original: "one\ntwo",
      modified: "one\nthree",
      options: { ignoreCase: false, ignoreWhitespace: false, precision: "smart" },
      collapseUnchanged: false,
      wrap: false,
    });
    // jsdom has no matchMedia, so the narrow default applies: one column.
    expect(lastProps?.view).toBe("unified");
  });

  it("goes back to the inputs with the text kept", async () => {
    const user = userEvent.setup();
    await open(user);
    await user.click(screen.getByRole("button", { name: "Nhập lại" }));
    expect(box("Văn bản gốc").value).toBe("one\ntwo");
    expect(box("Văn bản đã sửa").value).toBe("one\nthree");
  });

  it("shows the number of differences with a breakdown", async () => {
    const user = userEvent.setup();
    await open(user);
    const status = await screen.findByRole("status", { name: "Tóm tắt khác biệt" });
    expect(within(status).getByText("2 khác biệt")).toBeInTheDocument();
    expect(within(status).getByText("thêm 1 · xóa 0 · đổi 1")).toBeInTheDocument();
  });

  it("says so when the texts are identical, and has nothing to jump to", async () => {
    const user = userEvent.setup();
    nextReport = { total: 0, added: 0, removed: 0, changed: 0, precise: true };
    await open(user);
    expect(await screen.findByText("Hai văn bản giống nhau")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Khác biệt sau" })).toBeDisabled();
  });

  it("says so when both texts are empty", async () => {
    const user = userEvent.setup();
    nextReport = { total: 0, added: 0, removed: 0, changed: 0, precise: true };
    setup();
    await compare(user);
    expect(await screen.findByText("Hai văn bản trống")).toBeInTheDocument();
  });

  it("jumps between differences", async () => {
    const user = userEvent.setup();
    await open(user);
    await user.click(await screen.findByRole("button", { name: "Khác biệt sau" }));
    await user.click(screen.getByRole("button", { name: "Khác biệt trước" }));
    expect(next).toHaveBeenCalledTimes(1);
    expect(prev).toHaveBeenCalledTimes(1);
  });

  it("passes the options and view to the diff editor", async () => {
    const user = userEvent.setup();
    await open(user);
    await user.click(screen.getByRole("checkbox", { name: "Bỏ qua khoảng trắng" }));
    await user.click(screen.getByRole("checkbox", { name: "Bỏ qua hoa/thường" }));
    await user.click(screen.getByRole("checkbox", { name: "Ẩn dòng giống nhau" }));
    await user.click(screen.getByRole("checkbox", { name: "Xuống dòng" }));
    await user.click(screen.getByRole("radio", { name: "Từ" }));
    await user.click(screen.getByRole("radio", { name: "Hai cột" }));
    expect(lastProps).toMatchObject({
      view: "split",
      options: { ignoreCase: true, ignoreWhitespace: true, precision: "word" },
      collapseUnchanged: true,
      wrap: true,
    });
  });

  it("keeps edits made in the result and swaps sides", async () => {
    const user = userEvent.setup();
    await open(user);
    await user.click(screen.getByRole("button", { name: "edit-modified" }));
    expect(lastProps?.modified).toBe("edited");
    await user.click(screen.getByRole("button", { name: "Đổi hai bên" }));
    expect(lastProps).toMatchObject({ original: "edited", modified: "one\ntwo" });
  });

  it("warns when the comparison is only approximate", async () => {
    const user = userEvent.setup();
    nextReport = { total: 1, added: 0, removed: 0, changed: 1, precise: false };
    await open(user);
    expect(await screen.findByText(/chỉ gần đúng/)).toBeInTheDocument();
  });
});
