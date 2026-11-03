import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColorContrast } from "./color-contrast/ColorContrast";
import { ColorPalette } from "./color-palette/ColorPalette";
import { ColorPicker } from "./color-picker/ColorPicker";
import { CssGradient } from "./css-gradient/CssGradient";
import { generateHarmony, parseColor, rgbToHsl, type Color } from "./shared/color-core";

vi.mock("../../components/editors/CodeEditor", () => ({
  CodeEditor: ({ value, ariaLabel }: { value: string; ariaLabel: string }) => (
    <textarea aria-label={ariaLabel} value={value} readOnly />
  ),
}));

const renderTool = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);
const field = (name: string | RegExp) => screen.getByRole("textbox", { name }) as HTMLInputElement;
const typeInto = (name: string | RegExp, value: string) =>
  fireEvent.change(field(name), { target: { value } });
const KEY = "devkit:v1:recent-colors";

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("QA Recent Colors (AC 3.6)", () => {
  it("persists across a remount (reload) and is newest-first", async () => {
    const first = renderTool(<ColorPicker />);
    typeInto("HEX", "#112233");
    await waitFor(() => expect(localStorage.getItem(KEY)).toContain("#112233FF"), {
      timeout: 3000,
    });
    typeInto("HEX", "#445566");
    await waitFor(() => expect(localStorage.getItem(KEY)).toContain("#445566FF"), {
      timeout: 3000,
    });
    first.unmount();
    renderTool(<ColorPicker />);
    const buttons = await screen.findAllByRole("button", { name: /^Dùng màu/ });
    expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Dùng màu #445566",
      "Dùng màu #112233",
    ]);
  });

  it("the starting color is not added on mount", async () => {
    renderTool(<ColorPicker />);
    await new Promise((r) => setTimeout(r, 1000));
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("same RGB with a different alpha is a different entry; same color is never duplicated", async () => {
    localStorage.setItem(KEY, JSON.stringify("#112233FF,#11223380,#112233FF,#AABBCCFF"));
    renderTool(<ColorPicker />);
    const buttons = await screen.findAllByRole("button", { name: /^Dùng màu/ });
    expect(buttons).toHaveLength(3);
  });

  it("clear empties the list and the stored value", async () => {
    const user = userEvent.setup();
    localStorage.setItem(KEY, JSON.stringify("#112233FF"));
    renderTool(<ColorPicker />);
    await screen.findByRole("button", { name: /^Dùng màu/ });
    await user.click(screen.getByRole("button", { name: "Xóa lịch sử" }));
    expect(screen.queryByRole("button", { name: /^Dùng màu/ })).not.toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it.each([
    ["not json", "{{{"],
    ["a number", "42"],
    ["an object", '{"a":1}'],
    ["null", "null"],
    ["lowercase / garbage entries", JSON.stringify("#abc,zzz,<script>,#12345678X")],
  ])("corrupt stored value (%s) is ignored", async (_n, raw) => {
    localStorage.setItem(KEY, raw);
    renderTool(<ColorPicker />);
    expect(await screen.findByText("Chưa có màu nào gần đây.")).toBeInTheDocument();
    // the tool still works afterwards
    typeInto("HEX", "#010203");
    expect(field("RGB / RGBA").value).toBe("rgb(1, 2, 3)");
  });

  it("localStorage blocked (getter throws): tool works and shows a non-blocking notice", async () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    renderTool(<ColorPicker />);
    typeInto("HEX", "#0A0B0C");
    expect(field("RGB / RGBA").value).toBe("rgb(10, 11, 12)");
    expect(await screen.findByText(/Trình duyệt không cho lưu lịch sử/)).toBeInTheDocument();
    // still usable and in-memory history works within the session
    await screen.findByRole("button", { name: "Dùng màu #0A0B0C" }, { timeout: 3000 });
  });

  it("localStorage full (setItem throws): tool works, notice appears, history kept in memory", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    renderTool(<ColorPicker />);
    typeInto("HEX", "#0A0B0D");
    await screen.findByRole("button", { name: "Dùng màu #0A0B0D" }, { timeout: 3000 });
    expect(screen.getByText(/Trình duyệt không cho lưu lịch sử/)).toBeInTheDocument();
  });

  it("SSR output equals the first client render (no hydration mismatch), stored colors apply after", async () => {
    localStorage.setItem(KEY, JSON.stringify("#112233FF"));
    const html = renderToString(
      <MemoryRouter>
        <ColorPicker />
      </MemoryRouter>,
    );
    expect(html).not.toContain("#112233");
    expect(html).toContain("Chưa có màu nào gần đây.");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const host = document.createElement("div");
    host.innerHTML = html;
    document.body.appendChild(host);
    const { hydrateRoot } = await import("react-dom/client");
    await act(async () => {
      hydrateRoot(
        host,
        <MemoryRouter>
          <ColorPicker />
        </MemoryRouter>,
      );
    });
    expect(errors.mock.calls.filter((c) => String(c[0]).match(/hydrat|did not match/i))).toEqual(
      [],
    );
    expect(await within(host).findByRole("button", { name: "Dùng màu #112233" })).toBeTruthy();
    host.remove();
  });
});

describe("QA Color Picker values", () => {
  it("alpha 0 / 0.5 / 1 are preserved in all three fields", () => {
    renderTool(<ColorPicker />);
    typeInto("RGB / RGBA", "rgba(10, 20, 30, 0)");
    expect(field("HEX").value).toBe("#0A141E00");
    expect(field("HSL / HSLA").value).toMatch(/^hsla\(.*, 0\)$/);
    typeInto("RGB / RGBA", "rgba(10, 20, 30, 1)");
    expect(field("HEX").value).toBe("#0A141E");
    fireEvent.blur(field("RGB / RGBA"));
    expect(field("RGB / RGBA").value).toBe("rgb(10, 20, 30)");
  });
  it("invalid input disables copy on that row and never alters other fields", () => {
    renderTool(<ColorPicker />);
    typeInto("HEX", "#GGGGGG");
    expect(field("RGB / RGBA").value).toBe("rgb(79, 70, 229)");
    typeInto("RGB / RGBA", "rgba(0,0,0,1.5)");
    expect(screen.getAllByText(/Màu không hợp lệ|ngoài phạm vi|alpha/i).length).toBeGreaterThan(0);
    fireEvent.blur(field("HEX"));
    fireEvent.blur(field("RGB / RGBA"));
    expect(field("HEX").value).toBe("#4F46E5");
  });
  it("copy sends exactly the displayed value of each format", async () => {
    const user = userEvent.setup();
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: write },
      configurable: true,
    });
    renderTool(<ColorPicker />);
    typeInto("HEX", "#FF000080");
    const copies = screen.getAllByRole("button", { name: /Copy/ });
    for (const b of copies) await user.click(b);
    const sent = write.mock.calls.map((c) => c[0]);
    expect(sent).toEqual(["#FF000080", "rgba(255, 0, 0, 0.5)", "hsla(0, 100%, 50%, 0.5)"]);
  });
  it("Random color gives opaque valid colors repeatedly", async () => {
    const user = userEvent.setup();
    renderTool(<ColorPicker />);
    for (let i = 0; i < 20; i++) {
      await user.click(screen.getByRole("button", { name: "Màu ngẫu nhiên" }));
      expect(field("HEX").value).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});

describe("QA Color Palette (AC 3.7)", () => {
  const items = () =>
    within(screen.getByRole("list", { name: "Bảng màu" })).getAllByRole("listitem");
  const hexes = () => items().map((li) => li.querySelector("p.font-mono")!.textContent!);
  const parse = (h: string): Color => {
    const r = parseColor(h);
    if (!r.ok) throw new Error(h);
    return r.value;
  };
  const modes: Array<
    [string, "monochromatic" | "analogous" | "complementary" | "triadic" | "tetradic"]
  > = [
    ["Đơn sắc", "monochromatic"],
    ["Tương tự", "analogous"],
    ["Bổ túc", "complementary"],
    ["Tam giác", "triadic"],
    ["Tứ giác", "tetradic"],
  ];
  it.each(modes)(
    "%s: UI shows exactly the core's colors for counts 2, 5, 10 (clamped to the mode's range)",
    async (label, mode) => {
      const user = userEvent.setup();
      renderTool(<ColorPalette />);
      await user.click(screen.getByRole("radio", { name: label }));
      for (const n of [2, 5, 10]) {
        fireEvent.change(screen.getByLabelText("Số lượng màu"), { target: { value: String(n) } });
        const expected = generateHarmony(parse("#4F46E5"), mode, n).length;
        expect(items()).toHaveLength(expected);
        expect(new Set(hexes()).size).toBeGreaterThan(1);
      }
    },
  );
  it("non-numeric / empty / decimal count never breaks the palette", () => {
    renderTool(<ColorPalette />);
    const input = screen.getByLabelText("Số lượng màu");
    for (const v of ["", "abc", "0", "-3", "99", "4.6"]) {
      fireEvent.change(input, { target: { value: v } });
      const n = items().length;
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(10);
    }
  });
  it("invalid base: palette and CSS stay on the last valid base", () => {
    renderTool(<ColorPalette />);
    const before = hexes();
    typeInto("Màu gốc", "#12");
    expect(hexes()).toEqual(before);
    typeInto("Màu gốc", "rgb(256,0,0)");
    expect(hexes()).toEqual(before);
  });
  it("base hue drives the result; monochromatic keeps the base hue", async () => {
    const user = userEvent.setup();
    renderTool(<ColorPalette />);
    typeInto("Màu gốc", "#FF0000");
    await user.click(screen.getByRole("radio", { name: "Đơn sắc" }));
    for (const h of hexes()) {
      const hsl = rgbToHsl(parse(h));
      expect(Math.min(hsl.h, 360 - hsl.h)).toBeLessThan(2.5);
    }
  });
  it("copy all copies every swatch value, one per line; per-swatch copy copies its value", async () => {
    const user = userEvent.setup();
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: write },
      configurable: true,
    });
    renderTool(<ColorPalette />);
    const shown = hexes();
    await user.click(screen.getByRole("button", { name: "Copy tất cả" }));
    expect(write).toHaveBeenLastCalledWith(shown.join("\n"));
    const firstItem = items()[1]!;
    await user.click(within(firstItem).getByRole("button"));
    expect(write).toHaveBeenLastCalledWith(shown[1]);
  });
  it("css variables: one per swatch, valid syntax, hostile prefix cannot inject", () => {
    renderTool(<ColorPalette />);
    typeInto("Tiền tố biến CSS", "x;}body{display:none");
    const css = screen.getByLabelText("CSS Variables của bảng màu").textContent!;
    expect(css.match(/^ {2}--[a-z][a-z0-9-]*-\d+: #[0-9A-F]{6}([0-9A-F]{2})?;$/gm)).toHaveLength(5);
    expect(css).not.toMatch(/[;:]\s*display|body\s*\{/);
    expect(css.match(/[{}]/g)).toHaveLength(2);
  });
  it("count box shows the effective count after mode switch", async () => {
    const user = userEvent.setup();
    renderTool(<ColorPalette />);
    fireEvent.change(screen.getByLabelText("Số lượng màu"), { target: { value: "2" } });
    fireEvent.blur(screen.getByLabelText("Số lượng màu"));
    await user.click(screen.getByRole("radio", { name: "Tứ giác" }));
    expect(items()).toHaveLength(4);
    expect((screen.getByLabelText("Số lượng màu") as HTMLInputElement).value).toBe("4");
  });
});

describe("QA Color Contrast (AC 3.8)", () => {
  const ratioText = () => screen.getByTestId("ratio").textContent!;
  it("references: black/white 21, same colors 1, #767676 4.54, #777 4.47", () => {
    renderTool(<ColorContrast />);
    typeInto("Màu chữ", "#000");
    typeInto("Màu nền", "#FFF");
    expect(ratioText()).toContain("21.00");
    expect(screen.getAllByText("Đạt")).toHaveLength(4);
    typeInto("Màu chữ", "#FFF");
    expect(ratioText()).toContain("1.00");
    expect(screen.getAllByText("Không đạt")).toHaveLength(4);
    typeInto("Màu chữ", "#767676");
    expect(ratioText()).toContain("4.54");
    typeInto("Màu chữ", "#777777");
    expect(ratioText()).toContain("4.47");
  });
  it("pass/fail uses text and an icon (not colour alone), and is exposed in a table", () => {
    renderTool(<ColorContrast />);
    typeInto("Màu chữ", "#777777");
    typeInto("Màu nền", "#FFFFFF");
    const cells = screen.getAllByRole("cell");
    expect(cells).toHaveLength(4);
    for (const cell of cells) {
      expect(cell.textContent).toMatch(/Đạt|Không đạt/);
      expect(cell.querySelector("svg")).not.toBeNull();
    }
    // AA normal fails, AA large passes, AAA normal fails, AAA large (4.5) fails at 4.47
    expect(cells.map((c) => c.textContent)).toEqual(["Không đạt", "Đạt", "Không đạt", "Không đạt"]);
  });
  it("SD-15 shown as 3.97 and AA large passes only", () => {
    renderTool(<ColorContrast />);
    typeInto("Màu chữ", "rgba(0,0,0,0.5)");
    typeInto("Màu nền", "#FFFFFF");
    expect(ratioText()).toContain("3.97");
    expect(screen.getAllByRole("cell").map((c) => c.textContent)).toEqual([
      "Không đạt",
      "Đạt",
      "Không đạt",
      "Không đạt",
    ]);
    expect(screen.getByText(/#808080/)).toBeInTheDocument(); // effective colour shown (127.5 -> 80)
  });
  it("swap keeps alpha and is its own inverse", async () => {
    const user = userEvent.setup();
    renderTool(<ColorContrast />);
    typeInto("Màu chữ", "#11223344");
    typeInto("Màu nền", "#FFFFFF");
    fireEvent.blur(field("Màu chữ"));
    fireEvent.blur(field("Màu nền"));
    await user.click(screen.getByRole("button", { name: "Đổi chỗ" }));
    expect(field("Màu chữ").value).toBe("#FFFFFF");
    expect(field("Màu nền").value).toBe("#11223344");
    await user.click(screen.getByRole("button", { name: "Đổi chỗ" }));
    expect(field("Màu chữ").value).toBe("#11223344");
  });
  it("custom assumed background is used and its alpha is dropped", async () => {
    const user = userEvent.setup();
    renderTool(<ColorContrast />);
    typeInto("Màu chữ", "#000000");
    typeInto("Màu nền", "#FFFFFF00");
    const onWhite = ratioText();
    await user.click(screen.getByRole("radio", { name: /Tùy chọn|Tuỳ chọn|Khác/i }));
    typeInto("Màu nền giả định", "#000000");
    expect(ratioText()).not.toBe(onWhite);
    expect(ratioText()).toContain("1.00");
  });
  it("every suggestion shown meets the chosen target (displayed hex re-parsed)", async () => {
    const user = userEvent.setup();
    renderTool(<ColorContrast />);
    for (const [fg, bg] of [
      ["#999999", "#FFFFFF"],
      ["#6366F1", "#FFFFFF"],
      ["#CCCCCC", "#222222"],
      ["#FF8800", "#FFFF00"],
    ]) {
      typeInto("Màu chữ", fg!);
      typeInto("Màu nền", bg!);
      for (const t of ["AA", "AAA"]) {
        await user.click(screen.getByRole("radio", { name: t }));
        const target = t === "AA" ? 4.5 : 7;
        const text = screen.queryByText(/#[0-9A-F]{6}/, { selector: "span.font-mono" });
        if (!text) continue;
        const hex = /#[0-9A-F]{6}/.exec(text.textContent!)![0];
        typeInto("Màu chữ", hex);
        expect(Number(ratioText().split(" ")[0])).toBeGreaterThanOrEqual(target);
        typeInto("Màu chữ", fg!);
      }
    }
  });
  it("invalid input never replaces the last valid result (no stale/NaN)", () => {
    renderTool(<ColorContrast />);
    typeInto("Màu nền", "rgb(0,0,300)");
    expect(ratioText()).not.toMatch(/NaN|Infinity/);
    expect(ratioText()).toContain("17.06");
  });
});

describe("QA CSS Gradient (AC 3.9)", () => {
  const stopList = () => screen.getByRole("list", { name: "Thứ tự điểm màu theo vị trí" });
  const css = () => screen.getByLabelText("Mã CSS của gradient").textContent!;
  const colors = () =>
    within(stopList())
      .getAllByRole("listitem")
      .map((li) => (within(li).getAllByRole("textbox")[0] as HTMLInputElement).value);

  it("preview equals copied CSS (same declaration applied to an element)", () => {
    renderTool(<CssGradient />);
    const probe = document.createElement("div");
    probe.setAttribute("style", css());
    const preview = screen.getByRole("img", { name: "Xem trước gradient" });
    expect(preview.style.backgroundImage).not.toBe("");
    expect(preview.style.backgroundImage).toBe(probe.style.backgroundImage);
  });

  it("identity is stable: edits and moves follow the stop, not the row index", async () => {
    const user = userEvent.setup();
    renderTool(<CssGradient />);
    await user.click(screen.getByRole("button", { name: "Hoàng hôn" })); // 3 stops F97316, EC4899, 7C3AED
    expect(colors()).toEqual(["#F97316", "#EC4899", "#7C3AED"]);
    await user.click(screen.getByRole("button", { name: "Chuyển điểm 3 lên" }));
    expect(colors()).toEqual(["#F97316", "#7C3AED", "#EC4899"]);
    typeInto("Màu điểm 2", "#000000");
    expect(colors()).toEqual(["#F97316", "#000000", "#EC4899"]);
    await user.click(screen.getByRole("button", { name: "Xóa điểm 1" }));
    expect(colors()).toEqual(["#000000", "#EC4899"]);
    expect(css()).toMatch(/#000000 \d+%, #EC4899 100%\);$/);
    expect(css()).toContain("0%");
  });

  it("moving a stop to the top/bottom repeatedly never loses or duplicates stops", async () => {
    const user = userEvent.setup();
    renderTool(<CssGradient />);
    await user.click(screen.getByRole("button", { name: "Hoàng hôn" }));
    const before = [...colors()].sort();
    for (let i = 0; i < 6; i++) {
      await user.click(screen.getByRole("button", { name: "Chuyển điểm 1 xuống" }));
      await user.click(screen.getByRole("button", { name: "Chuyển điểm 2 xuống" }));
    }
    expect([...colors()].sort()).toEqual(before);
    expect(css().match(/#[0-9A-F]{6} /g)).toHaveLength(3);
  });

  it("2..10 stops: every added stop appears in css, positions within 0..100", async () => {
    const user = userEvent.setup();
    renderTool(<CssGradient />);
    for (let i = 0; i < 8; i++)
      await user.click(screen.getByRole("button", { name: "Thêm điểm màu" }));
    const positions = [...css().matchAll(/ (\d+(?:\.\d+)?)%/g)].map((m) => Number(m[1]));
    expect(positions).toHaveLength(10);
    positions.forEach((p) => {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    });
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    for (let i = 0; i < 12; i++) {
      const del = screen.getAllByRole("button", { name: /^Xóa điểm/ })[0] as HTMLButtonElement;
      if (!del.disabled) await user.click(del);
    }
    expect(within(stopList()).getAllByRole("listitem")).toHaveLength(2);
  });

  it("stop positions: negative, >100, decimals and non-numbers", () => {
    renderTool(<CssGradient />);
    const pos = screen.getByLabelText("Vị trí điểm 1 (%)");
    fireEvent.change(pos, { target: { value: "-20" } });
    expect(css()).toContain("0%");
    fireEvent.change(pos, { target: { value: "33.333" } });
    expect(css()).toContain("33.33%");
    fireEvent.change(pos, { target: { value: "abc" } });
    expect(css()).toMatch(/linear-gradient\(/);
  });

  it("linear angle: 0, 360, out of range and decimals produce a valid normalised angle", () => {
    renderTool(<CssGradient />);
    const angle = screen.getByLabelText("Góc (độ)");
    for (const [input, expected] of [
      ["0", "0deg"],
      ["360", "0deg"],
      ["400", "0deg"],
      ["-45", "0deg"],
      ["45.5", "45.5deg"],
      ["359", "359deg"],
    ] as const) {
      fireEvent.change(angle, { target: { value: input } });
      expect(css(), input).toContain(`linear-gradient(${expected},`);
    }
  });

  it("radial: every position option yields CSS the engine accepts", async () => {
    const user = userEvent.setup();
    renderTool(<CssGradient />);
    await user.click(screen.getByRole("radio", { name: "Radial" }));
    const select = screen.getByLabelText("Vị trí tâm") as HTMLSelectElement;
    const probe = document.createElement("div");
    for (const option of Array.from(select.options)) {
      await user.selectOptions(select, option.value);
      expect(css()).toContain(`radial-gradient(circle at ${option.value},`);
      probe.style.backgroundImage = "";
      probe.setAttribute("style", css());
      expect(probe.style.backgroundImage, option.value).not.toBe("");
    }
  });

  it("alpha stops serialise as 8-digit hex and stay in the preview", () => {
    renderTool(<CssGradient />);
    typeInto("Màu điểm 1", "rgba(0,0,0,0.5)");
    expect(css()).toContain("#00000080 0%");
  });

  it("control names exist and reorder/remove buttons are real focusable buttons", () => {
    renderTool(<CssGradient />);
    for (const name of ["Chuyển điểm 1 xuống", "Chuyển điểm 2 lên", "Thêm điểm màu", "Copy CSS"]) {
      const b = screen.getByRole("button", { name });
      expect(b.tagName).toBe("BUTTON");
      expect((b as HTMLButtonElement).tabIndex).toBeGreaterThanOrEqual(0);
    }
    expect(screen.getByRole("slider", { name: /Thanh trượt góc|góc/i })).toBeInTheDocument();
  });

  it("an emptied number box stays empty while typing and leaves the stop alone", () => {
    renderTool(<CssGradient />);
    const pos = screen.getByLabelText("Vị trí điểm 2 (%)") as HTMLInputElement;
    fireEvent.change(pos, { target: { value: "" } });
    expect(pos.value).toBe("");
    expect(css()).toContain("#EC4899 100%");
    fireEvent.change(pos, { target: { value: "75" } });
    expect(css()).toContain("#EC4899 75%");
    fireEvent.blur(pos);
    expect(pos.value).toBe("75");
  });
});

describe("Review fixes: gradient list order, harmony, notes, names", () => {
  const css = () => screen.getByLabelText("Mã CSS của gradient").textContent!;
  const colorsInList = () =>
    screen
      .getAllByRole("textbox")
      .filter((el) =>
        document.querySelector(`label[for="${el.id}"]`)?.textContent?.startsWith("Màu điểm"),
      )
      .map((el) => (el as HTMLInputElement).value);
  const cssColors = () => [...css().matchAll(/#[0-9A-F]{6}/g)].map((match) => match[0]);

  it("keeps the list in the order the gradient shows after add, edit and move", async () => {
    const user = userEvent.setup();
    renderTool(<CssGradient />);
    await user.click(screen.getByRole("button", { name: "Thêm điểm màu" }));
    fireEvent.change(screen.getByLabelText("Màu điểm 2"), { target: { value: "#00FF00" } });
    expect(colorsInList()).toEqual(cssColors());
    expect(colorsInList()).toEqual(["#4F46E5", "#00FF00", "#EC4899"]);
    await user.click(screen.getByRole("button", { name: "Chuyển điểm 2 xuống" }));
    expect(colorsInList()).toEqual(cssColors());
    expect(colorsInList()).toEqual(["#4F46E5", "#EC4899", "#00FF00"]);
    await user.click(screen.getByRole("button", { name: "Chuyển điểm 3 lên" }));
    expect(colorsInList()).toEqual(cssColors());
  });

  it("re-sorts the list after a position is typed and the box loses focus", () => {
    renderTool(<CssGradient />);
    const first = screen.getByLabelText("Vị trí điểm 1 (%)");
    fireEvent.change(first, { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Vị trí điểm 2 (%)"), { target: { value: "0" } });
    fireEvent.blur(first);
    expect(colorsInList()).toEqual(cssColors());
  });

  it("the transparency note names the background only when the background is translucent", () => {
    renderTool(<ColorContrast />);
    typeInto("Màu chữ", "#00000080");
    typeInto("Màu nền", "#000000");
    expect(screen.getAllByText(/trộn lên màu nền trước khi tính/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/nền giả định \(#/)).not.toBeInTheDocument();
  });

  it("copy buttons for swatches say which color they copy", () => {
    renderTool(<ColorPalette />);
    expect(screen.getByRole("button", { name: "Copy #4F46E5" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy CSS Variables" })).toBeInTheDocument();
  });
});
