import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeJwt, sampleHeader, sampleToken, validToken } from "../../tests/fixtures";
import { Base64Tool } from "./base64/Base64Tool";
import { JsonFormatter } from "./json-formatter/JsonFormatter";
import { JwtDecoder } from "./jwt-decoder/JwtDecoder";
import { UuidGenerator } from "./uuid-generator/UuidGenerator";

// QA tests (independent of the implementation). The editor is a textarea because jsdom cannot lay out CodeMirror.
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
const field = (name: string) => screen.getByRole("textbox", { name }) as HTMLTextAreaElement;
const type = (name: string, value: string) => fireEvent.change(field(name), { target: { value } });

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("QA JSON Formatter (PRD 3.1)", () => {
  it("TC-J1 Minify output is valid JSON equal in value to the input (AC 3.1-3)", async () => {
    const user = userEvent.setup();
    const source = '{ "s": "tiếng Việt 😀 \\u00e9", "n": [1, 2.5, -3e2, null, true], "o": {} }';
    renderTool(<JsonFormatter />);
    type("Ô nhập JSON", source);
    await user.click(screen.getByRole("button", { name: "Minify" }));
    const out = field("Kết quả JSON").value;
    expect(JSON.parse(out)).toEqual(JSON.parse(source));
    expect(out).not.toMatch(/\n| {2}/);
  });

  it("TC-J2 Format keeps Unicode, escapes and key order (AC 3.1-1)", async () => {
    renderTool(<JsonFormatter />);
    const source = '{"z":1,"a":"Nguyễn 😀","m":{"b":[],"a":{}}}';
    type("Ô nhập JSON", source);
    await waitFor(() => expect(field("Kết quả JSON").value).not.toBe(""));
    const out = field("Kết quả JSON").value;
    expect(JSON.parse(out)).toEqual(JSON.parse(source));
    expect(Object.keys(JSON.parse(out))).toEqual(["z", "a", "m"]);
  });

  it("TC-J3 hostile input is never rendered as HTML (SEC 4.2)", async () => {
    const { container } = renderTool(<JsonFormatter />);
    type("Ô nhập JSON", '{"a":"<img src=x onerror=alert(1)><script>window.__pwned=1</script>"}');
    await waitFor(() => expect(field("Kết quả JSON").value).toContain("<img"));
    expect(container.querySelector("img[src='x']")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
    type("Ô nhập JSON", "<img src=x onerror=alert(1)>");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("TC-J4 does not crash on every kind of garbage and always shows text, not only colour (AC 3.1-2, 4.3)", async () => {
    renderTool(<JsonFormatter />);
    for (const bad of [
      "{",
      "}",
      "[1,]",
      "{'a':1}",
      "undefined",
      "NaN",
      '{"a":01}',
      "\u0000",
      "\\",
      '"abc',
    ]) {
      type("Ô nhập JSON", bad);
      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toMatch(/JSON không hợp lệ/);
      expect(screen.getByText("Không hợp lệ")).toBeInTheDocument();
    }
  });

  it("TC-J5 an error never alters the input text (BR: no silent fixing)", async () => {
    renderTool(<JsonFormatter />);
    const broken = "{'a': 1, // comment\n}";
    type("Ô nhập JSON", broken);
    await screen.findByRole("alert");
    expect(field("Ô nhập JSON").value).toBe(broken);
  });

  it("TC-J6 Clear empties input AND output and Undo restores the input (FR Clear input/output)", async () => {
    const user = userEvent.setup();
    renderTool(<JsonFormatter />);
    type("Ô nhập JSON", '{"a":1}');
    await waitFor(() => expect(field("Kết quả JSON").value).not.toBe(""));
    await user.click(screen.getByRole("button", { name: "Xóa" }));
    expect(field("Ô nhập JSON").value).toBe("");
    expect(field("Kết quả JSON").value).toBe("");
    expect(screen.getByRole("button", { name: "Xóa" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Hoàn tác" }));
    expect(field("Ô nhập JSON").value).toBe('{"a":1}');
    await waitFor(() => expect(field("Kết quả JSON").value).toContain('"a": 1'));
  });

  it("TC-J7 Undo bar expires after its timeout and Undo is then gone", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderTool(<JsonFormatter />);
    type("Ô nhập JSON", "[1]");
    fireEvent.click(screen.getByRole("button", { name: "Xóa" }));
    expect(screen.getByRole("button", { name: "Hoàn tác" })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(screen.queryByRole("button", { name: "Hoàn tác" })).not.toBeInTheDocument();
  });

  it("TC-J8 Format/Minify are disabled for blank input; whitespace-only input yields no error and no output", () => {
    renderTool(<JsonFormatter />);
    expect(screen.getByRole("button", { name: "Format" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Minify" })).toBeDisabled();
    type("Ô nhập JSON", "   \n\t ");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(field("Kết quả JSON").value).toBe("");
  });

  it("TC-J9 Copy writes exactly the visible output; disabled while there is none (AC 3.1-4)", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    renderTool(<JsonFormatter />);
    expect(screen.getByRole("button", { name: "Copy" })).toBeDisabled();
    type("Ô nhập JSON", '{"a":[1]}');
    await waitFor(() => expect(field("Kết quả JSON").value).not.toBe(""));
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith(field("Kết quả JSON").value);
    expect(await screen.findAllByText("Đã copy")).not.toHaveLength(0);
  });

  it("TC-J10 Copy failure is reported with guidance, not silently (components.md 4)", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    renderTool(<JsonFormatter />);
    type("Ô nhập JSON", "[1]");
    await waitFor(() => expect(field("Kết quả JSON").value).not.toBe(""));
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect((await screen.findAllByText(/Không copy được/)).length).toBeGreaterThan(0);
  });

  it("TC-J11 error then fix: banner disappears and output is replaced; previous label is removed", async () => {
    renderTool(<JsonFormatter />);
    type("Ô nhập JSON", '{"a":1}');
    await waitFor(() => expect(field("Kết quả JSON").value).toContain("1"));
    type("Ô nhập JSON", '{"a":');
    await screen.findByRole("alert");
    expect(screen.getByRole("heading", { name: "Kết quả trước đó" })).toBeInTheDocument();
    type("Ô nhập JSON", '{"a":2}');
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(field("Kết quả JSON").value).toContain('"a": 2');
    expect(screen.queryByRole("heading", { name: "Kết quả trước đó" })).not.toBeInTheDocument();
  });

  it("TC-J12 error with no earlier output shows no stale panel label", async () => {
    renderTool(<JsonFormatter />);
    type("Ô nhập JSON", "{");
    await screen.findByRole("alert");
    expect(screen.queryByRole("heading", { name: "Kết quả trước đó" })).not.toBeInTheDocument();
    expect(field("Kết quả JSON").value).toBe("");
  });

  it("TC-J13 very large input (>200k chars) does not auto-run, runs on Format press (docs/04 7.1)", async () => {
    const user = userEvent.setup();
    renderTool(<JsonFormatter />);
    const big = JSON.stringify(Array.from({ length: 30000 }, (_, i) => ({ i, s: "abcdef" })));
    expect(big.length).toBeGreaterThan(200_000);
    type("Ô nhập JSON", big);
    await new Promise((r) => setTimeout(r, 400));
    expect(field("Kết quả JSON").value).toBe("");
    await user.click(screen.getByRole("button", { name: "Format" }));
    expect(JSON.parse(field("Kết quả JSON").value)).toHaveLength(30000);
  });

  it("TC-J14 duplicate Format clicks are idempotent; indent 4 then 2 re-renders", async () => {
    const user = userEvent.setup();
    renderTool(<JsonFormatter />);
    type("Ô nhập JSON", '{"a":1}');
    const btn = screen.getByRole("button", { name: "Format" });
    await user.click(btn);
    await user.click(btn);
    const once = field("Kết quả JSON").value;
    await user.click(btn);
    expect(field("Kết quả JSON").value).toBe(once);
    await user.click(screen.getByRole("radio", { name: "4 dấu cách" }));
    await user.click(screen.getByRole("radio", { name: "2 dấu cách" }));
    expect(field("Kết quả JSON").value).toBe(once);
  });

  it("TC-J15 every interactive control has an accessible name (4.3)", () => {
    renderTool(<JsonFormatter />);
    for (const el of [
      ...screen.getAllByRole("button"),
      ...screen.getAllByRole("radio"),
      ...screen.getAllByRole("textbox"),
    ]) {
      const name = el.getAttribute("aria-label") ?? el.textContent ?? "";
      const labelled =
        el.getAttribute("aria-labelledby") || (el as HTMLInputElement).labels?.length;
      expect(name.trim() !== "" || labelled).toBeTruthy();
    }
  });
});

describe("QA Base64 (PRD 3.3)", () => {
  it("TC-B1 round trip of tricky Unicode, standard and URL-safe, through the UI (AC 3.3-1)", async () => {
    const user = userEvent.setup();
    renderTool(<Base64Tool />);
    const samples = [
      "Tiếng Việt: Nguyễn Văn A",
      "😀👨‍👩‍👧 𝒳",
      "a\u0000b",
      "line1\nline2\n",
      "é é",
      "?>?>",
    ];
    for (const urlSafe of [false, true]) {
      if (urlSafe) await user.click(screen.getByRole("checkbox", { name: /URL-safe/ }));
      for (const s of samples) {
        // fresh state each time: reset input & mode through the UI
        if (
          screen.getByRole("radio", { name: "Giải mã" }).getAttribute("aria-checked") === "true"
        ) {
          await user.click(screen.getByRole("radio", { name: "Mã hóa" }));
        }
        type("Ô nhập", s);
        const bytes = Buffer.from(s, "utf8");
        const encoded = urlSafe ? bytes.toString("base64url") : bytes.toString("base64");
        await waitFor(() => expect(field("Kết quả").value).toBe(encoded));
        await user.click(screen.getByRole("button", { name: "Đổi chiều" }));
        await waitFor(() => expect(field("Kết quả").value).toBe(s));
        expect(field("Ô nhập").value).toBe(encoded);
      }
    }
  }, 30000);

  it("TC-B2 invalid Base64 never crashes for hostile inputs (AC 3.3-2)", async () => {
    const user = userEvent.setup();
    renderTool(<Base64Tool />);
    await user.click(screen.getByRole("radio", { name: "Giải mã" }));
    for (const bad of [
      "A",
      "====",
      "Zm9v=Zm9v",
      "Zm9vY",
      "😀",
      "<script>",
      "/w==/w==",
      "AAAA\u0000",
    ]) {
      type("Ô nhập", bad);
      await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
      expect(screen.getByText("Không hợp lệ")).toBeInTheDocument();
    }
  });

  it("TC-B3 decoding bytes that are not UTF-8 gives an error, not mojibake", async () => {
    const user = userEvent.setup();
    renderTool(<Base64Tool />);
    await user.click(screen.getByRole("radio", { name: "Giải mã" }));
    type("Ô nhập", "/w=="); // 0xFF
    expect(await screen.findByRole("alert")).toHaveTextContent(/Base64/);
    expect(field("Kết quả").value).toBe("");
  });

  it("TC-B4 switching mode never leaves stale output from the other direction under a new heading (AC 3.3-3)", async () => {
    const user = userEvent.setup();
    renderTool(<Base64Tool />);
    type("Ô nhập", "hello");
    await waitFor(() => expect(field("Kết quả").value).toBe("aGVsbG8="));
    await user.click(screen.getByRole("radio", { name: "Giải mã" }));
    // "hello" is not valid Base64 (length 5): the output pane must not still show the ENCODE result "aGVsbG8="
    // under the decode-mode heading "Văn bản".
    await screen.findByRole("alert");
    expect(field("Kết quả").value).not.toBe("aGVsbG8=");
  });

  it("TC-B5 on a decode error the retained previous output is labelled as previous (components.md 4 'giữ output trước đó có nhãn', plan E-15)", async () => {
    const user = userEvent.setup();
    renderTool(<Base64Tool />);
    await user.click(screen.getByRole("radio", { name: "Giải mã" }));
    type("Ô nhập", "Zm9vYmFy");
    await waitFor(() => expect(field("Kết quả").value).toBe("foobar"));
    type("Ô nhập", "Zm9vYmF@");
    await screen.findByRole("alert");
    expect(field("Kết quả").value).toBe("foobar"); // kept (SD-10)
    expect(screen.getByRole("heading", { name: /trước đó/i })).toBeInTheDocument();
  });

  it("TC-B6 Clear empties both sides, Undo restores input", async () => {
    const user = userEvent.setup();
    renderTool(<Base64Tool />);
    type("Ô nhập", "abc");
    await waitFor(() => expect(field("Kết quả").value).toBe("YWJj"));
    await user.click(screen.getByRole("button", { name: "Xóa" }));
    expect(field("Ô nhập").value).toBe("");
    expect(field("Kết quả").value).toBe("");
    await user.click(screen.getByRole("button", { name: "Hoàn tác" }));
    expect(field("Ô nhập").value).toBe("abc");
    await waitFor(() => expect(field("Kết quả").value).toBe("YWJj"));
  });

  it("TC-B7 Swap is disabled with nothing to swap and after an error", async () => {
    const user = userEvent.setup();
    renderTool(<Base64Tool />);
    expect(screen.getByRole("button", { name: "Đổi chiều" })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "Giải mã" }));
    type("Ô nhập", "@@@@");
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Đổi chiều" })).toBeDisabled();
  });

  it("TC-B8 Copy copies the visible output, disabled when empty", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    renderTool(<Base64Tool />);
    expect(screen.getByRole("button", { name: "Copy" })).toBeDisabled();
    type("Ô nhập", "Xin chào");
    await waitFor(() => expect(field("Kết quả").value).not.toBe(""));
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("WGluIGNow6Bv");
  });

  it("TC-B9 URL-safe toggle re-converts existing input and decode accepts unpadded Base64URL", async () => {
    const user = userEvent.setup();
    renderTool(<Base64Tool />);
    type("Ô nhập", "??>>");
    await waitFor(() => expect(field("Kết quả").value).toBe("Pz8+Pg=="));
    await user.click(screen.getByRole("checkbox", { name: /URL-safe/ }));
    await waitFor(() => expect(field("Kết quả").value).toBe("Pz8-Pg"));
    await user.click(screen.getByRole("radio", { name: "Giải mã" }));
    type("Ô nhập", "Pz8-Pg");
    await waitFor(() => expect(field("Kết quả").value).toBe("??>>"));
  });

  it("TC-B10 large input (1 MB) encodes without crashing", async () => {
    renderTool(<Base64Tool />);
    type("Ô nhập", "x".repeat(1_000_000));
    await waitFor(() => expect(field("Kết quả").value.length).toBeGreaterThan(1_000_000), {
      timeout: 3000,
    });
  });

  it("TC-B11 the output is never injected as HTML", async () => {
    const { container } = renderTool(<Base64Tool />);
    type("Ô nhập", "<img src=x onerror=alert(1)>");
    await waitFor(() => expect(field("Kết quả").value).not.toBe(""));
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("QA JWT Decoder (PRD 3.2)", () => {
  const set = (value: string) => fireEvent.change(field("Token JWT"), { target: { value } });

  it("TC-T1 decodes the standard sample exactly (AC 3.2-1)", () => {
    renderTool(<JwtDecoder />);
    set(sampleToken);
    expect(JSON.parse(field("Header JWT").value)).toEqual(sampleHeader);
    expect(JSON.parse(field("Payload JWT").value)).toEqual({
      sub: "1234567890",
      name: "John Doe",
      iat: 1516239022,
    });
  });

  it("TC-T2 Copy header and Copy payload write the formatted JSON (FR copy)", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    renderTool(<JwtDecoder />);
    set(sampleToken);
    await user.click(screen.getByRole("button", { name: /header/i }));
    expect(JSON.parse(writeText.mock.calls.at(-1)![0])).toEqual(sampleHeader);
    await user.click(screen.getByRole("button", { name: /payload/i }));
    expect(JSON.parse(writeText.mock.calls.at(-1)![0]).name).toBe("John Doe");
  });

  it("TC-T3 the warning is visible with empty, valid and invalid input and never says verified (AC 3.2-3)", () => {
    renderTool(<JwtDecoder />);
    for (const v of ["", sampleToken, "garbage"]) {
      set(v);
      expect(screen.getByRole("note")).toHaveTextContent(/không xác minh chữ ký/);
      expect(document.body.textContent ?? "").not.toMatch(/đã xác minh|signature verified/i);
    }
    set(sampleToken);
    expect(screen.getByText("Chưa được xác minh")).toBeInTheDocument();
    expect(screen.queryByText(/^Đã xác minh/)).not.toBeInTheDocument();
  });

  it("TC-T4 malformed tokens show an alert with text and hide decoded panels (AC 3.2-2)", () => {
    renderTool(<JwtDecoder />);
    for (const bad of [
      "abc",
      "a.b",
      "a.b.c.d",
      "eyJ!.eyJ!.sig",
      "..",
      "e30.e30",
      "W10.W10.x",
      "bnVsbA.bnVsbA.x",
      "MQ.MQ.x",
      "<script>.<b>.x",
    ]) {
      set(bad);
      expect(screen.getByRole("alert").textContent?.length).toBeGreaterThan(5);
      expect(screen.queryByRole("textbox", { name: "Header JWT" })).not.toBeInTheDocument();
    }
  });

  it("TC-T5 whitespace-only input is the empty state, not an error", () => {
    renderTool(<JwtDecoder />);
    set("  \n ");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("TC-T6 exp/nbf/iat edge values: string, negative, huge, float, boolean never crash", () => {
    renderTool(<JwtDecoder />);
    for (const payload of [
      { exp: "1700000000" },
      { exp: -1 },
      { exp: 1e20 },
      { exp: 1.5 },
      { nbf: true, iat: null },
      { exp: 8.64e12 },
      { exp: 8.64e12 + 1 },
    ]) {
      set(makeJwt(sampleHeader, payload));
      expect(screen.getByRole("textbox", { name: "Payload JWT" })).toBeInTheDocument();
    }
  });

  it("TC-T7 token with no exp says so; not-yet-valid nbf is flagged by text", () => {
    renderTool(<JwtDecoder />);
    set(makeJwt(sampleHeader, { sub: "a" }));
    expect(screen.getByText(/không có claim exp/i)).toBeInTheDocument();
    set(makeJwt(sampleHeader, { nbf: Math.floor(Date.now() / 1000) + 3600 }));
    expect(screen.getByText(/Chưa có hiệu lực/i)).toBeInTheDocument();
  });

  it("TC-T8 expired and valid status use the device clock (fake time)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    renderTool(<JwtDecoder />);
    set(validToken);
    expect(screen.getByText(/Còn hạn/)).toBeInTheDocument();
    act(() => {
      vi.setSystemTime(new Date("2024-01-01T02:00:00Z"));
      vi.advanceTimersByTime(31_000);
    });
    expect(screen.getByText(/Đã hết hạn/)).toBeInTheDocument();
  });

  it("TC-T9 Unicode claims and hostile claim values are shown as text only", () => {
    const { container } = renderTool(<JwtDecoder />);
    set(makeJwt(sampleHeader, { name: "Nguyễn 😀", x: "<img src=x onerror=alert(1)>" }));
    expect(field("Payload JWT").value).toContain("Nguyễn 😀");
    expect(container.querySelector("img")).toBeNull();
  });

  it("TC-T10 Clear + Undo; token field is not autocompleted/spellchecked", async () => {
    const user = userEvent.setup();
    renderTool(<JwtDecoder />);
    expect(field("Token JWT")).toHaveAttribute("autocomplete", "off");
    set(sampleToken);
    await user.click(screen.getByRole("button", { name: "Xóa" }));
    expect(field("Token JWT").value).toBe("");
    expect(screen.queryByRole("textbox", { name: "Header JWT" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hoàn tác" }));
    expect(field("Token JWT").value).toBe(sampleToken);
  });

  it("TC-T11 (SD-10) an invalid token after a valid one keeps previous decoded output", () => {
    renderTool(<JwtDecoder />);
    set(sampleToken);
    set("not.a.valid.token.here");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Header JWT" })).toBeInTheDocument();
  });
});

describe("QA UUID Generator (PRD 3.4)", () => {
  const items = () =>
    within(screen.getByRole("list", { name: "Danh sách UUID" })).getAllByRole("listitem");
  const setCount = (v: string) =>
    fireEvent.change(screen.getByRole("spinbutton", { name: "Số lượng" }), {
      target: { value: v },
    });
  const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it("TC-U1 boundaries 1 and 1000 generate exactly that many valid, distinct v4 UUIDs (AC 3.4-1,3)", async () => {
    const user = userEvent.setup({ delay: null });
    renderTool(<UuidGenerator />);
    for (const n of [1, 1000]) {
      setCount(String(n));
      await user.click(screen.getByRole("button", { name: "Tạo UUID" }));
      const values = items().map((li) => li.querySelector("code")!.textContent!);
      expect(values).toHaveLength(n);
      expect(new Set(values).size).toBe(n);
      for (const v of values) expect(v).toMatch(V4);
      expect(screen.getByText(`${n === 1000 ? "1.000" : n} UUID`)).toBeInTheDocument();
    }
  }, 20000);

  it("TC-U2 invalid counts (0, -1, 1001, 2.5, empty) are rejected with text and never generate", async () => {
    const user = userEvent.setup();
    renderTool(<UuidGenerator />);
    for (const bad of ["0", "-1", "1001", "2.5", "", "99999999999"]) {
      setCount(bad);
      await user.click(screen.getByRole("button", { name: "Tạo UUID" }));
      expect(screen.getByRole("alert")).toHaveTextContent("từ 1 đến 1000");
      expect(screen.queryByRole("list", { name: "Danh sách UUID" })).not.toBeInTheDocument();
    }
  });

  it("TC-U3 Generate again produces a new set; error clears after a valid generation", async () => {
    const user = userEvent.setup();
    renderTool(<UuidGenerator />);
    await user.click(screen.getByRole("button", { name: "Tạo UUID" }));
    const first = items().map((li) => li.textContent);
    setCount("0");
    await user.click(screen.getByRole("button", { name: "Tạo UUID" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    setCount("5");
    await user.click(screen.getByRole("button", { name: "Tạo UUID" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(items().map((li) => li.textContent)).not.toEqual(first);
  });

  it("TC-U4 Copy-all content equals the displayed list in order; each Copy button has a unique accessible name", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    renderTool(<UuidGenerator />);
    setCount("20");
    await user.click(screen.getByRole("button", { name: "Tạo UUID" }));
    const shown = items().map((li) => li.querySelector("code")!.textContent!);
    await user.click(screen.getByRole("button", { name: "Copy tất cả" }));
    expect(writeText.mock.calls.at(-1)![0]).toBe(shown.join("\n"));
    const names = items().map((li) => within(li).getByRole("button").getAttribute("aria-label"));
    expect(new Set(names).size).toBe(20);
  });

  it("TC-U5 no Web Crypto: shows an error, no list, no Math.random fallback (AC 3.4-2)", async () => {
    const user = userEvent.setup();
    const rnd = vi.spyOn(Math, "random");
    vi.stubGlobal("crypto", undefined);
    renderTool(<UuidGenerator />);
    await user.click(screen.getByRole("button", { name: "Tạo UUID" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Web Crypto/);
    expect(screen.queryByRole("list", { name: "Danh sách UUID" })).not.toBeInTheDocument();
    expect(rnd).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("TC-U6 Ctrl+Enter generates; double click regenerates without duplicating DOM", async () => {
    const user = userEvent.setup();
    renderTool(<UuidGenerator />);
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(items()).toHaveLength(5);
    const btn = screen.getByRole("button", { name: "Tạo UUID" });
    await user.dblClick(btn);
    expect(items()).toHaveLength(5);
  });

  it("TC-U7 Copy failure surfaces a visible message", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    renderTool(<UuidGenerator />);
    await user.click(screen.getByRole("button", { name: "Tạo UUID" }));
    await user.click(screen.getByRole("button", { name: "Copy tất cả" }));
    expect((await screen.findAllByText(/Không copy được/)).length).toBeGreaterThan(0);
  });

  it("TC-U8 count field and buttons are reachable by keyboard and labelled (4.3)", async () => {
    const user = userEvent.setup();
    renderTool(<UuidGenerator />);
    await user.tab();
    expect(document.activeElement).not.toBe(document.body);
    expect(screen.getByRole("spinbutton", { name: "Số lượng" })).toHaveAttribute("min", "1");
    expect(screen.getByRole("spinbutton", { name: "Số lượng" })).toHaveAttribute("max", "1000");
  });
});

describe("QA privacy (SD-7, PRD 4.2) across all four tools", () => {
  it("TC-P1 full interaction makes no network call and writes nothing to storage/console", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    const beacon = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
    const xhr = vi.spyOn(XMLHttpRequest.prototype, "open");
    const log = vi.spyOn(console, "log");
    const warn = vi.spyOn(console, "warn");
    const err = vi.spyOn(console, "error");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const secret = "SECRET-INPUT-123";

    for (const ui of [
      <JsonFormatter key="j" />,
      <Base64Tool key="b" />,
      <JwtDecoder key="t" />,
      <UuidGenerator key="u" />,
    ]) {
      const { unmount } = renderTool(ui);
      const box = screen.queryAllByRole("textbox")[0];
      if (box) fireEvent.change(box, { target: { value: secret } });
      for (const b of screen.queryAllByRole("button")) {
        if (!(b as HTMLButtonElement).disabled) await user.click(b);
      }
      unmount();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
    expect(xhr).not.toHaveBeenCalled();
    for (const spy of [log, warn, err]) {
      for (const call of spy.mock.calls) expect(JSON.stringify(call)).not.toContain(secret);
    }
    for (const call of setItem.mock.calls) expect(JSON.stringify(call)).not.toContain(secret);
    vi.unstubAllGlobals();
  });
});
