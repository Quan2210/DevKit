import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColorContrast } from "./color-contrast/ColorContrast";
import { ColorPalette } from "./color-palette/ColorPalette";
import { ColorPicker } from "./color-picker/ColorPicker";
import { CssGradient } from "./css-gradient/CssGradient";

// CodeMirror needs real layout; the editor behaviour is covered in the browser, so use a textarea here.
vi.mock("../../components/editors/CodeEditor", () => ({
  CodeEditor: ({ value, ariaLabel }: { value: string; ariaLabel: string }) => (
    <textarea aria-label={ariaLabel} value={value} readOnly />
  ),
}));

const renderTool = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);
const field = (name: string | RegExp) => screen.getByRole("textbox", { name }) as HTMLInputElement;
const typeInto = (name: string | RegExp, value: string) =>
  fireEvent.change(field(name), { target: { value } });

beforeEach(() => localStorage.clear());
afterEach(() => vi.useRealTimers());

describe("Color Picker", () => {
  it("shows the same color in HEX, RGB and HSL", () => {
    renderTool(<ColorPicker />);
    expect(field("HEX").value).toBe("#4F46E5");
    expect(field("RGB / RGBA").value).toBe("rgb(79, 70, 229)");
    expect(field("HSL / HSLA").value).toBe("hsl(243, 75%, 59%)");
  });

  it("applies valid text at once and keeps alpha", () => {
    renderTool(<ColorPicker />);
    typeInto("HEX", "#FF000080");
    expect(field("RGB / RGBA").value).toBe("rgba(255, 0, 0, 0.5)");
    expect(field("HSL / HSLA").value).toBe("hsla(0, 100%, 50%, 0.5)");
  });

  it("accepts another format in any field", () => {
    renderTool(<ColorPicker />);
    typeInto("RGB / RGBA", "rgb(0 128 0 / 25%)");
    expect(field("HEX").value).toBe("#00800040");
  });

  it("shows an error next to an invalid value and leaves the color alone", () => {
    renderTool(<ColorPicker />);
    typeInto("HEX", "#12");
    expect(screen.getByText(/Màu không hợp lệ/)).toBeInTheDocument();
    expect(field("RGB / RGBA").value).toBe("rgb(79, 70, 229)");
    fireEvent.blur(field("HEX"));
    expect(field("HEX").value).toBe("#4F46E5");
  });

  it("rejects out-of-range channels instead of clamping", () => {
    renderTool(<ColorPicker />);
    typeInto("RGB / RGBA", "rgb(300, 0, 0)");
    expect(screen.getAllByText(/ngoài phạm vi/).length).toBeGreaterThan(0);
    expect(field("HEX").value).toBe("#4F46E5");
  });

  it("Random color changes the color to a valid one", async () => {
    const user = userEvent.setup();
    renderTool(<ColorPicker />);
    await user.click(screen.getByRole("button", { name: "Màu ngẫu nhiên" }));
    expect(field("HEX").value).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("remembers colors after a pause, without duplicates, and clears the history", async () => {
    const user = userEvent.setup();
    renderTool(<ColorPicker />);
    typeInto("HEX", "#112233");
    await waitFor(
      () => expect(screen.getByRole("button", { name: /^Dùng màu #112233$/ })).toBeInTheDocument(),
      {
        timeout: 3000,
      },
    );
    typeInto("HEX", "#445566");
    await waitFor(
      () => expect(screen.getByRole("button", { name: /^Dùng màu #445566$/ })).toBeInTheDocument(),
      { timeout: 3000 },
    );
    typeInto("HEX", "#112233");
    await waitFor(
      () =>
        expect(screen.getAllByRole("button", { name: /Dùng màu/ }).length).toBeGreaterThanOrEqual(
          2,
        ),
      { timeout: 3000 },
    );
    expect(screen.getAllByRole("button", { name: /^Dùng màu #112233$/ })).toHaveLength(1);
    expect(localStorage.getItem("devkit:v1:recent-colors")).toContain("#112233FF");

    await user.click(screen.getByRole("button", { name: "Xóa lịch sử" }));
    expect(screen.queryAllByRole("button", { name: /Dùng màu/ })).toHaveLength(0);
    expect(localStorage.getItem("devkit:v1:recent-colors")).toBeNull();
  });

  it("keeps at most 20 recent colors", async () => {
    localStorage.setItem(
      "devkit:v1:recent-colors",
      JSON.stringify(
        Array.from(
          { length: 30 },
          (_, i) => `#${i.toString(16).padStart(2, "0").toUpperCase()}0000FF`,
        ).join(","),
      ),
    );
    renderTool(<ColorPicker />);
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /Dùng màu/ }).length).toBeLessThanOrEqual(20),
    );
  });

  it("ignores a corrupt stored history", async () => {
    localStorage.setItem("devkit:v1:recent-colors", JSON.stringify(["not", "valid"]));
    renderTool(<ColorPicker />);
    expect(await screen.findByText("Chưa có màu nào gần đây.")).toBeInTheDocument();
  });
});

describe("Color Palette", () => {
  it("shows five analogous colors with the base marked", () => {
    renderTool(<ColorPalette />);
    const swatches = screen.getByRole("list", { name: "Bảng màu" });
    expect(within(swatches).getAllByRole("listitem")).toHaveLength(5);
    expect(within(swatches).getByText("Gốc")).toBeInTheDocument();
  });

  it("changes the number of colors and clamps to the rule's range", async () => {
    const user = userEvent.setup();
    renderTool(<ColorPalette />);
    fireEvent.change(screen.getByLabelText("Số lượng màu"), { target: { value: "8" } });
    expect(
      within(screen.getByRole("list", { name: "Bảng màu" })).getAllByRole("listitem"),
    ).toHaveLength(8);
    await user.click(screen.getByRole("radio", { name: "Tứ giác" }));
    fireEvent.change(screen.getByLabelText("Số lượng màu"), { target: { value: "1" } });
    expect(
      within(screen.getByRole("list", { name: "Bảng màu" })).getAllByRole("listitem"),
    ).toHaveLength(4);
  });

  it("exports valid CSS variables with a sanitized prefix", () => {
    renderTool(<ColorPalette />);
    const css = () =>
      (screen.getByLabelText("CSS Variables của bảng màu") as HTMLTextAreaElement).value;
    expect(css()).toContain(":root {");
    expect(css()).toContain("--color-1: #4F46E5;");
    typeInto("Tiền tố biến CSS", "My Brand");
    expect(css()).toContain("--my-brand-5:");
  });

  it("validates the base color", () => {
    renderTool(<ColorPalette />);
    typeInto("Màu gốc", "nope");
    expect(screen.getByText(/Màu không hợp lệ/)).toBeInTheDocument();
  });
});

describe("Color Contrast", () => {
  it("shows the ratio and a pass in every cell for dark text on a light background", () => {
    renderTool(<ColorContrast />);
    expect(screen.getByTestId("ratio")).toHaveTextContent("17.06 : 1");
    expect(screen.getAllByText("Đạt")).toHaveLength(4);
    expect(screen.queryByText("Không đạt")).not.toBeInTheDocument();
  });

  it("states pass and fail in words, not only color", () => {
    renderTool(<ColorContrast />);
    typeInto("Màu chữ", "#777777");
    typeInto("Màu nền", "#FFFFFF");
    expect(screen.getByTestId("ratio")).toHaveTextContent("4.47 : 1");
    expect(screen.getAllByText("Không đạt").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Đạt").length).toBeGreaterThan(0);
  });

  it("never reads 4.499 as a pass", () => {
    renderTool(<ColorContrast />);
    typeInto("Màu chữ", "#777777");
    typeInto("Màu nền", "#FFFFFF");
    const rows = screen.getAllByRole("row");
    const aa = rows.find((row) => within(row).queryByRole("rowheader", { name: /AA\b/i }))!;
    expect(within(aa).getAllByText(/Đạt|Không đạt/)[0]).toHaveTextContent("Không đạt");
  });

  it("swaps the two colors", async () => {
    const user = userEvent.setup();
    renderTool(<ColorContrast />);
    await user.click(screen.getByRole("button", { name: "Đổi chỗ" }));
    expect(field("Màu chữ").value).toBe("#F8FAFC");
    expect(field("Màu nền").value).toBe("#0F172A");
  });

  it("explains transparency and gives the effective colors", () => {
    renderTool(<ColorContrast />);
    typeInto("Màu chữ", "#00000080");
    typeInto("Màu nền", "#FFFFFF");
    expect(screen.getAllByText(/trộn lên nền giả định/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("ratio")).toHaveTextContent("4.00 : 1");
  });

  it("changes the assumed background for a translucent background", async () => {
    const user = userEvent.setup();
    renderTool(<ColorContrast />);
    typeInto("Màu chữ", "#000000");
    typeInto("Màu nền", "#FFFFFF80");
    const onWhite = screen.getByTestId("ratio").textContent;
    await user.click(screen.getByRole("radio", { name: "Đen" }));
    expect(screen.getByTestId("ratio").textContent).not.toBe(onWhite);
  });

  it("suggests a passing text color and applies it", async () => {
    const user = userEvent.setup();
    renderTool(<ColorContrast />);
    typeInto("Màu chữ", "#999999");
    typeInto("Màu nền", "#FFFFFF");
    await user.click(screen.getByRole("button", { name: "Dùng màu này" }));
    const ratio = Number(screen.getByTestId("ratio").textContent!.split(" ")[0]);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(screen.getByText("Màu chữ hiện tại đã đạt ngưỡng này.")).toBeInTheDocument();
  });

  it("validates both colors", () => {
    renderTool(<ColorContrast />);
    typeInto("Màu chữ", "zzz");
    expect(screen.getByText(/Màu không hợp lệ/)).toBeInTheDocument();
    expect(screen.getByTestId("ratio")).toHaveTextContent("17.06 : 1");
  });

  it("copies foreground and background as HEX", async () => {
    const user = userEvent.setup();
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: write },
      configurable: true,
    });
    renderTool(<ColorContrast />);
    await user.click(screen.getByRole("button", { name: "Copy màu chữ" }));
    expect(write).toHaveBeenCalledWith("#0F172A");
    await user.click(screen.getByRole("button", { name: "Copy màu nền" }));
    expect(write).toHaveBeenCalledWith("#F8FAFC");
  });
});

describe("CSS Gradient", () => {
  const stopList = () => screen.getByRole("list", { name: "Thứ tự điểm màu theo vị trí" });
  const css = () => screen.getByLabelText("Mã CSS của gradient").textContent;

  it("starts with a two-stop linear gradient", () => {
    renderTool(<CssGradient />);
    expect(css()).toBe("background: linear-gradient(135deg, #4F46E5 0%, #EC4899 100%);");
  });

  it("changes the angle", () => {
    renderTool(<CssGradient />);
    fireEvent.change(screen.getByLabelText("Góc (độ)"), { target: { value: "90" } });
    expect(css()).toContain("linear-gradient(90deg,");
  });

  it("switches to radial with shape and position", async () => {
    const user = userEvent.setup();
    renderTool(<CssGradient />);
    await user.click(screen.getByRole("radio", { name: "Radial" }));
    await user.click(screen.getByRole("radio", { name: "Elip" }));
    await user.selectOptions(screen.getByLabelText("Vị trí tâm"), "top left");
    expect(css()).toContain("radial-gradient(ellipse at top left,");
  });

  it("adds, edits and removes stops, never below two", async () => {
    const user = userEvent.setup();
    renderTool(<CssGradient />);
    expect(screen.getByRole("button", { name: "Xóa điểm 1" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Thêm điểm màu" }));
    expect(within(stopList()).getAllByRole("listitem")).toHaveLength(3);
    typeInto("Màu điểm 3", "#00FF00");
    expect(css()).toContain("#00FF00");
    await user.click(screen.getByRole("button", { name: "Xóa điểm 3" }));
    expect(within(stopList()).getAllByRole("listitem")).toHaveLength(2);
    expect(css()).not.toContain("#00FF00");
  });

  it("limits the number of stops", async () => {
    const user = userEvent.setup();
    renderTool(<CssGradient />);
    for (let i = 0; i < 12; i += 1) {
      const add = screen.getByRole("button", { name: "Thêm điểm màu" });
      if (!(add as HTMLButtonElement).disabled) await user.click(add);
    }
    expect(within(stopList()).getAllByRole("listitem")).toHaveLength(10);
    expect(screen.getByRole("button", { name: "Thêm điểm màu" })).toBeDisabled();
  });

  it("reorders with the buttons and keeps the CSS in position order", async () => {
    const user = userEvent.setup();
    renderTool(<CssGradient />);
    await user.click(screen.getByRole("button", { name: "Chuyển điểm 1 xuống" }));
    expect(field("Màu điểm 1").value).toBe("#EC4899");
    expect(field("Màu điểm 2").value).toBe("#4F46E5");
    expect(css()).toBe("background: linear-gradient(135deg, #EC4899 0%, #4F46E5 100%);");
    expect(screen.getByRole("button", { name: "Chuyển điểm 1 lên" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Chuyển điểm 2 xuống" })).toBeDisabled();
  });

  it("sorts stops by position in the CSS whatever the list order", () => {
    renderTool(<CssGradient />);
    fireEvent.change(screen.getByLabelText("Vị trí điểm 1 (%)"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Vị trí điểm 2 (%)"), { target: { value: "0" } });
    expect(css()).toBe("background: linear-gradient(135deg, #EC4899 0%, #4F46E5 100%);");
  });

  it("clamps stop positions into 0 to 100", () => {
    renderTool(<CssGradient />);
    fireEvent.change(screen.getByLabelText("Vị trí điểm 2 (%)"), { target: { value: "250" } });
    expect(css()).toContain("#EC4899 100%");
  });

  it("loads a preset", async () => {
    const user = userEvent.setup();
    renderTool(<CssGradient />);
    await user.click(screen.getByRole("button", { name: "Hoàng hôn" }));
    expect(within(stopList()).getAllByRole("listitem")).toHaveLength(3);
    expect(css()).toContain("#F97316 0%");
  });

  it("copies the CSS that is previewed", async () => {
    const user = userEvent.setup();
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: write },
      configurable: true,
    });
    renderTool(<CssGradient />);
    await user.click(screen.getByRole("button", { name: "Copy CSS" }));
    expect(write).toHaveBeenCalledWith(css());
  });

  it("applies the gradient to the preview", () => {
    renderTool(<CssGradient />);
    const preview = screen.getByRole("img", { name: "Xem trước gradient" });
    expect(preview.style.backgroundImage).toContain("linear-gradient");
  });
});
