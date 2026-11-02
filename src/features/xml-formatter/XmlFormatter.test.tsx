import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { XmlFormatter } from "./XmlFormatter";

// CodeMirror needs real layout; the editor behaviour is covered in the browser, so use a textarea here.
vi.mock("../../components/editors/CodeEditor", () => ({
  CodeEditor: ({
    value,
    onChange,
    readOnly,
    ariaLabel,
  }: {
    value: string;
    onChange?: (value: string) => void;
    readOnly?: boolean;
    ariaLabel: string;
  }) => (
    <textarea
      aria-label={ariaLabel}
      value={value}
      readOnly={readOnly}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

const renderTool = () =>
  render(
    <MemoryRouter>
      <XmlFormatter />
    </MemoryRouter>,
  );
const type = (value: string) =>
  fireEvent.change(screen.getByRole("textbox", { name: "Ô nhập XML" }), { target: { value } });
const output = () =>
  (screen.getByRole("textbox", { name: "Kết quả XML" }) as HTMLTextAreaElement).value;

afterEach(() => vi.restoreAllMocks());

describe("XML Formatter", () => {
  it("formats valid XML after typing and shows a valid status", async () => {
    renderTool();
    type("<a><b>1</b></a>");
    await waitFor(() => expect(output()).toBe("<a>\n  <b>1</b>\n</a>"));
    expect(screen.getByText("Hợp lệ")).toBeInTheDocument();
  });

  it("Minify and the indent option change the output", async () => {
    const user = userEvent.setup();
    renderTool();
    type("<a>\n  <b>1</b>\n</a>");
    await user.click(screen.getByRole("button", { name: "Minify" }));
    expect(output()).toBe("<a><b>1</b></a>");
    await user.click(screen.getByRole("button", { name: "Format" }));
    await user.click(screen.getByRole("radio", { name: "4 dấu cách" }));
    expect(output()).toBe("<a>\n    <b>1</b>\n</a>");
  });

  it("shows an error for broken XML, no fake success, and keeps the previous output labelled", async () => {
    renderTool();
    type("<a><b>1</b></a>");
    await waitFor(() => expect(output()).not.toBe(""));
    type("<a><b>1</a>");
    await waitFor(() => expect(screen.getByText("XML không hợp lệ.")).toBeInTheDocument());
    expect(screen.getByText("Không hợp lệ")).toBeInTheDocument();
    expect(screen.getByText("Kết quả trước đó")).toBeInTheDocument();
  });

  it("downloads the result as document.xml", async () => {
    const user = userEvent.setup();
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:x");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderTool();
    type("<a><b/></a>");
    await waitFor(() => expect(output()).not.toBe(""));
    await user.click(screen.getByRole("button", { name: "Tải .xml" }));
    expect(click).toHaveBeenCalled();
    const blob = create.mock.calls[0]![0] as Blob;
    expect(await blob.text()).toBe("<a>\n  <b/>\n</a>");
    expect(blob.type).toContain("xml");
  });

  it("clears with an undo", async () => {
    const user = userEvent.setup();
    renderTool();
    type("<a/>");
    await user.click(screen.getByRole("button", { name: "Xóa" }));
    expect(screen.getByRole("textbox", { name: "Ô nhập XML" })).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Hoàn tác" }));
    expect(screen.getByRole("textbox", { name: "Ô nhập XML" })).toHaveValue("<a/>");
  });

  it("disables Format and Minify with no input", () => {
    renderTool();
    expect(screen.getByRole("button", { name: "Format" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Minify" })).toBeDisabled();
  });

  it("warns when the declaration is not UTF-8", async () => {
    renderTool();
    type('<?xml version="1.0" encoding="ISO-8859-1"?><a/>');
    await waitFor(() => expect(screen.getByText(/ISO-8859-1/)).toBeInTheDocument());
  });

  it("disables the download while the shown output is from an earlier input", async () => {
    renderTool();
    type("<a/>");
    await waitFor(() => expect(output()).not.toBe(""));
    expect(screen.getByRole("button", { name: "Tải .xml" })).toBeEnabled();
    type("<a>");
    await waitFor(() => expect(screen.getByText("XML không hợp lệ.")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Tải .xml" })).toBeDisabled();
  });
});
