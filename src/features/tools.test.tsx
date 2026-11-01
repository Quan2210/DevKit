import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { expiredToken, validToken } from "../../tests/fixtures";
import { Base64Tool } from "./base64/Base64Tool";
import { JsonFormatter } from "./json-formatter/JsonFormatter";
import { JwtDecoder } from "./jwt-decoder/JwtDecoder";
import { UuidGenerator } from "./uuid-generator/UuidGenerator";

// CodeMirror needs real layout; the editor behaviour is covered in the browser, so use a textarea here.
vi.mock("../components/editors/CodeEditor", () => ({
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

const renderTool = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);
const type = (name: string, value: string) =>
  fireEvent.change(screen.getByRole("textbox", { name }), { target: { value } });
const outputOf = (name: string) =>
  (screen.getByRole("textbox", { name }) as HTMLTextAreaElement).value;

describe("JSON Formatter", () => {
  it("formats valid JSON after typing and shows a valid status", async () => {
    renderTool(<JsonFormatter />);
    type("Ô nhập JSON", '{"a":[1,2]}');
    await waitFor(() =>
      expect(outputOf("Kết quả JSON")).toBe('{\n  "a": [\n    1,\n    2\n  ]\n}'),
    );
    expect(screen.getByText("Hợp lệ")).toBeInTheDocument();
  });

  it("Minify and the indent option change the output at once", async () => {
    const user = userEvent.setup();
    renderTool(<JsonFormatter />);
    type("Ô nhập JSON", '{ "a": 1 }');
    await user.click(screen.getByRole("button", { name: "Minify" }));
    expect(outputOf("Kết quả JSON")).toBe('{"a":1}');
    await user.click(screen.getByRole("button", { name: "Format" }));
    await user.click(screen.getByRole("radio", { name: "4 dấu cách" }));
    expect(outputOf("Kết quả JSON")).toBe('{\n    "a": 1\n}');
  });

  it("shows an inline error with its position and keeps the previous valid output", async () => {
    renderTool(<JsonFormatter />);
    type("Ô nhập JSON", '{"a":1}');
    await waitFor(() => expect(outputOf("Kết quả JSON")).toContain('"a": 1'));
    type("Ô nhập JSON", '{\n  "a": 1,\n  oops\n}');
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("JSON không hợp lệ.");
    expect(within(alert).getByRole("button", { name: /Dòng 3/ })).toBeInTheDocument();
    expect(screen.getByText("Không hợp lệ")).toBeInTheDocument();
    expect(outputOf("Kết quả JSON")).toContain('"a": 1');
    expect(screen.getByRole("heading", { name: "Kết quả trước đó" })).toBeInTheDocument();
  });

  it("empties the output when the input is emptied", async () => {
    renderTool(<JsonFormatter />);
    type("Ô nhập JSON", "[1]");
    await waitFor(() => expect(outputOf("Kết quả JSON")).not.toBe(""));
    type("Ô nhập JSON", "");
    await waitFor(() => expect(outputOf("Kết quả JSON")).toBe(""));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("warns about integers that lose precision", async () => {
    renderTool(<JsonFormatter />);
    type("Ô nhập JSON", '{"id": 12345678901234567890}');
    expect(
      await screen.findByText(
        /mất độ chính xác hoặc vượt phạm vi khi định dạng: 12345678901234567890/,
      ),
    ).toBeInTheDocument();
  });

  it("Clear offers Undo instead of asking for confirmation", async () => {
    const user = userEvent.setup();
    renderTool(<JsonFormatter />);
    type("Ô nhập JSON", '{"a":1}');
    await user.click(screen.getByRole("button", { name: "Xóa" }));
    expect(
      (screen.getByRole("textbox", { name: "Ô nhập JSON" }) as HTMLTextAreaElement).value,
    ).toBe("");
    await user.click(screen.getByRole("button", { name: "Hoàn tác" }));
    expect(
      (screen.getByRole("textbox", { name: "Ô nhập JSON" }) as HTMLTextAreaElement).value,
    ).toBe('{"a":1}');
  });

  it("the sample button fills a valid document", async () => {
    const user = userEvent.setup();
    renderTool(<JsonFormatter />);
    await user.click(screen.getByRole("button", { name: "Mẫu" }));
    await waitFor(() => expect(screen.getByText("Hợp lệ")).toBeInTheDocument());
  });
});

describe("Base64 tool", () => {
  it("encodes live and decodes after switching mode, including Unicode", async () => {
    const user = userEvent.setup();
    renderTool(<Base64Tool />);
    type("Ô nhập", "Xin chào");
    await waitFor(() => expect(outputOf("Kết quả")).toBe("WGluIGNow6Bv"));
    await user.click(screen.getByRole("radio", { name: "Giải mã" }));
    type("Ô nhập", "WGluIGNow6Bv");
    await waitFor(() => expect(outputOf("Kết quả")).toBe("Xin chào"));
  });

  it("Swap turns the output into the new input and flips the mode", async () => {
    const user = userEvent.setup();
    renderTool(<Base64Tool />);
    type("Ô nhập", "foobar");
    await waitFor(() => expect(outputOf("Kết quả")).toBe("Zm9vYmFy"));
    await user.click(screen.getByRole("button", { name: "Đổi chiều" }));
    expect((screen.getByRole("textbox", { name: "Ô nhập" }) as HTMLTextAreaElement).value).toBe(
      "Zm9vYmFy",
    );
    expect(screen.getByRole("radio", { name: "Giải mã" })).toBeChecked();
    await waitFor(() => expect(outputOf("Kết quả")).toBe("foobar"));
  });

  it("labels the two sides by mode so input and output are never confused", async () => {
    const user = userEvent.setup();
    renderTool(<Base64Tool />);
    const sides = () =>
      screen
        .getAllByRole("heading", { level: 2 })
        .slice(0, 2)
        .map((heading) => heading.textContent);
    expect(sides()).toEqual(["Văn bản", "Base64"]);
    await user.click(screen.getByRole("radio", { name: "Giải mã" }));
    expect(sides()).toEqual(["Base64", "Văn bản"]);
  });

  it("reports invalid Base64 with its position and does not crash", async () => {
    const user = userEvent.setup();
    renderTool(<Base64Tool />);
    await user.click(screen.getByRole("radio", { name: "Giải mã" }));
    type("Ô nhập", "Zm9v\nYm@y");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Không giải mã được Base64.");
    expect(within(alert).getByRole("button", { name: "Dòng 2, cột 3" })).toBeInTheDocument();
    expect(screen.getByText("Không hợp lệ")).toBeInTheDocument();
  });

  it("URL-safe option switches the alphabet", async () => {
    const user = userEvent.setup();
    renderTool(<Base64Tool />);
    await user.click(screen.getByRole("checkbox", { name: /URL-safe/ }));
    type("Ô nhập", "??>>");
    await waitFor(() => expect(outputOf("Kết quả")).toBe("Pz8-Pg"));
  });
});

describe("JWT Decoder", () => {
  it("always shows the 'decoding only' warning", () => {
    renderTool(<JwtDecoder />);
    expect(screen.getByRole("note")).toHaveTextContent("không xác minh chữ ký");
  });

  it("decodes the sample and shows header, payload, times and an unverified signature", async () => {
    const user = userEvent.setup();
    renderTool(<JwtDecoder />);
    await user.click(screen.getByRole("button", { name: "Mẫu" }));
    expect(outputOf("Header JWT")).toContain('"alg": "HS256"');
    expect(outputOf("Payload JWT")).toContain('"name": "John Doe"');
    expect(screen.getByText("Chưa được xác minh")).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveTextContent("Hết hạn (exp)");
    expect(screen.getByText(/Còn hạn, hết hạn/)).toBeInTheDocument();
  });

  it("marks a token with a past exp as expired", () => {
    renderTool(<JwtDecoder />);
    fireEvent.change(screen.getByRole("textbox", { name: "Token JWT" }), {
      target: { value: expiredToken },
    });
    expect(screen.getByText(/Đã hết hạn/)).toBeInTheDocument();
  });

  it("shows UTC next to local time", () => {
    renderTool(<JwtDecoder />);
    fireEvent.change(screen.getByRole("textbox", { name: "Token JWT" }), {
      target: { value: validToken },
    });
    expect(screen.getByRole("columnheader", { name: "UTC" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Giờ địa phương" })).toBeInTheDocument();
  });

  it("shows an error state for a malformed token and keeps the input", () => {
    renderTool(<JwtDecoder />);
    const field = screen.getByRole("textbox", { name: "Token JWT" }) as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: "not.a-token" } });
    expect(screen.getByRole("alert")).toHaveTextContent("JWT cần đúng 3 phần");
    expect(field.value).toBe("not.a-token");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("UUID Generator", () => {
  it("starts with an invitation and generates the requested count", async () => {
    const user = userEvent.setup();
    renderTool(<UuidGenerator />);
    expect(screen.getAllByText("Nhấn “Tạo UUID” để bắt đầu.").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Copy tất cả" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Tạo UUID" }));
    expect(
      within(screen.getByRole("list", { name: "Danh sách UUID" })).getAllByRole("listitem"),
    ).toHaveLength(5);
    expect(screen.getByText("5 UUID")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy tất cả" })).toBeEnabled();
  });

  it("rejects a count outside 1 to 1000 with an inline error and keeps the list", async () => {
    const user = userEvent.setup();
    renderTool(<UuidGenerator />);
    await user.click(screen.getByRole("button", { name: "Tạo UUID" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Số lượng" }), {
      target: { value: "1001" },
    });
    await user.click(screen.getByRole("button", { name: "Tạo UUID" }));
    expect(screen.getByRole("alert")).toHaveTextContent("từ 1 đến 1000");
    expect(screen.getByText("5 UUID")).toBeInTheDocument();
  });

  it("copies one UUID and all of them", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    renderTool(<UuidGenerator />);
    await user.click(screen.getByRole("button", { name: "Tạo UUID" }));
    const first = within(screen.getByRole("list", { name: "Danh sách UUID" })).getAllByRole(
      "listitem",
    )[0]!;
    const uuid = within(first).getByText(/^[0-9a-f-]{36}$/).textContent!;
    await user.click(within(first).getByRole("button", { name: new RegExp(uuid) }));
    expect(writeText).toHaveBeenLastCalledWith(uuid);
    await user.click(screen.getByRole("button", { name: "Copy tất cả" }));
    expect(writeText.mock.calls.at(-1)![0].split("\n")).toHaveLength(5);
  });
});
