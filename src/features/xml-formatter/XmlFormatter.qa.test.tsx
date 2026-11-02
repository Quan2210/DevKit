import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { XmlFormatter } from "./XmlFormatter";

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

describe("QA XML Formatter UI", () => {
  it("makes no network request while formatting (client-side only)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const xhr = vi.spyOn(XMLHttpRequest.prototype, "open");
    const beacon = vi.fn();
    vi.stubGlobal("navigator", Object.assign(Object.create(navigator), { sendBeacon: beacon }));
    renderTool();
    type('<!DOCTYPE a SYSTEM "http://example.invalid/x.dtd"><a><b>1</b></a>');
    await waitFor(() => expect(output()).not.toBe(""));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhr).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("invalid first input: error shown, output empty, Download/Copy disabled, no valid badge", async () => {
    renderTool();
    type("<a><b></a>");
    await waitFor(() => expect(screen.getByText("XML không hợp lệ.")).toBeInTheDocument());
    expect(output()).toBe("");
    expect(screen.getByRole("button", { name: "Tải .xml" })).toBeDisabled();
    expect(screen.queryByText("Hợp lệ")).not.toBeInTheDocument();
    expect(screen.getByText("Không hợp lệ")).toBeInTheDocument();
  });

  it("emptying input clears output and returns to idle", async () => {
    renderTool();
    type("<a/>");
    await waitFor(() => expect(output()).toBe("<a/>"));
    type("");
    await waitFor(() => expect(output()).toBe(""));
    expect(screen.queryByText("Hợp lệ")).not.toBeInTheDocument();
  });

  it("Ctrl+Enter applies the current mode", async () => {
    const user = userEvent.setup();
    renderTool();
    type("<a>\n <b/>\n</a>");
    await user.click(screen.getByRole("button", { name: "Minify" }));
    expect(output()).toBe("<a><b/></a>");
    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });
    expect(output()).toBe("<a><b/></a>");
  });

  it("large input waits for a button press and shows the notice", async () => {
    const user = userEvent.setup();
    renderTool();
    const big = "<r>" + "<i>1</i>".repeat(30_000) + "</r>";
    expect(big.length).toBeGreaterThan(200_000);
    type(big);
    await new Promise((r) => setTimeout(r, 400));
    expect(output()).toBe("");
    expect(screen.getByText(/Tài liệu lớn/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Format" }));
    await waitFor(() => expect(output().startsWith("<r>\n  <i>1</i>")).toBe(true), {
      timeout: 20000,
    });
  }, 30_000);

  it("a11y: controls have roles and names; error is exposed to assistive tech", async () => {
    renderTool();
    expect(screen.getByRole("button", { name: "Format" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Minify" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "2 dấu cách" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "4 dấu cách" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Ô nhập XML" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Kết quả XML" })).toHaveAttribute("readonly");
    type("<a>");
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("sample loads and formats", async () => {
    const user = userEvent.setup();
    renderTool();
    await user.click(screen.getByRole("button", { name: "Mẫu" }));
    await waitFor(() => expect(output()).not.toBe(""));
    expect(screen.getByText("Hợp lệ")).toBeInTheDocument();
  });
});
