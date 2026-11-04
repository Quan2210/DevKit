import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { JsonFormatter } from "../json-formatter/JsonFormatter";

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

const DOC = '{"name":"Speaking","sections":[{"id":"a1","parts":[{"n":1},{"n":2}]},{"id":"b2"}]}';

const pane = () => screen.getByRole("region", { name: "Ô trái" });
const input = () => within(pane()).getByRole("textbox", { name: "Ô nhập JSON" });
const crumbs = () => within(pane()).queryByRole("navigation", { name: "Đường dẫn trong dữ liệu" });

async function openTree(user: ReturnType<typeof userEvent.setup>, text = DOC) {
  render(
    <MemoryRouter>
      <JsonFormatter />
    </MemoryRouter>,
  );
  fireEvent.change(input(), { target: { value: text } });
  await user.click(within(pane()).getByRole("radio", { name: "Cây" }));
  return within(pane()).queryByRole("tree") as HTMLElement;
}

/** Types into the path box by setting its value: user.type would read "[" and "{" as key names. */
async function goPath(user: ReturnType<typeof userEvent.setup>, path: string) {
  await user.click(within(pane()).getByRole("button", { name: "Nhập đường dẫn" }));
  const box = within(pane()).getByRole("textbox", { name: "Đường dẫn tới nút" });
  fireEvent.change(box, { target: { value: path } });
  fireEvent.keyDown(box, { key: "Enter" });
}

describe("JSON editor: tree selection and breadcrumb", () => {
  it("shows the path of the selected node and jumps back to a parent", async () => {
    const user = userEvent.setup();
    const tree = await openTree(user);
    await user.click(within(tree).getByText("sections"));
    const nav = crumbs()!;
    expect(within(nav).getByRole("button", { name: "sections" })).toHaveAttribute(
      "aria-current",
      expect.anything(),
    );
    await user.click(within(nav).getByRole("button", { name: "Gốc" }));
    expect(within(crumbs()!).queryByRole("button", { name: "sections" })).not.toBeInTheDocument();
  });

  it("jumps to a typed path and reports a path that does not exist", async () => {
    const user = userEvent.setup();
    await openTree(user);
    await goPath(user, "sections[0].parts[1].n");
    const nav = crumbs()!;
    expect(
      within(nav)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(expect.arrayContaining(["Gốc", "sections", "0", "parts", "1", "n"]));
    expect(
      within(pane())
        .getAllByRole("treeitem")
        .find((item) => item.getAttribute("aria-selected") === "true"),
    ).toHaveTextContent("n");

    await goPath(user, "nope.x");
    expect(await screen.findByRole("alert")).toHaveTextContent("Không có nút ở đường dẫn này.");
    fireEvent.change(within(pane()).getByRole("textbox", { name: "Đường dẫn tới nút" }), {
      target: { value: "a[" },
    });
    fireEvent.keyDown(within(pane()).getByRole("textbox", { name: "Đường dẫn tới nút" }), {
      key: "Enter",
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Đường dẫn không hợp lệ.");
  });

  it("has no breadcrumb while the text is invalid", async () => {
    const user = userEvent.setup();
    await openTree(user, '{"a":');
    expect(crumbs()).not.toBeInTheDocument();
  });
});

describe("JSON editor: expand and collapse", () => {
  it("collapses everything and opens it all again", async () => {
    const user = userEvent.setup();
    const tree = await openTree(user);
    expect(within(tree).getByText('"Speaking"')).toBeInTheDocument(); // root and its children are open
    expect(within(tree).queryByText("id")).not.toBeInTheDocument(); // the next level is not
    expect(within(tree).getByText("0")).toBeInTheDocument();
    await user.click(within(pane()).getByRole("button", { name: "Thu hết" }));
    expect(within(tree).queryByText("0")).not.toBeInTheDocument(); // "sections" is closed now
    expect(within(tree).getByText("name")).toBeInTheDocument(); // the root stays open
    await user.click(within(pane()).getByRole("button", { name: "Mở hết" }));
    expect(within(tree).getAllByText("n")).toHaveLength(2);
  });
});

describe("JSON editor: search in the tree", () => {
  it("counts hits, steps through them and reveals matches inside closed nodes", async () => {
    const user = userEvent.setup();
    const tree = await openTree(user);
    await user.click(within(pane()).getByRole("button", { name: "Tìm kiếm (Ctrl+F)" }));
    const box = within(pane()).getByRole("searchbox", { name: "Tìm trong Ô trái" });
    await user.type(box, "id");
    expect(within(pane()).getByText("1/2")).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(within(pane()).getByText("2/2")).toBeInTheDocument();
    await user.clear(box);
    await user.type(box, "parts");
    expect(within(tree).getAllByText("parts").length).toBeGreaterThan(0);
    await user.clear(box);
    await user.type(box, "zzz");
    expect(within(pane()).getByText("Không có")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(within(pane()).queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("is unavailable when the pane is empty", () => {
    render(
      <MemoryRouter>
        <JsonFormatter />
      </MemoryRouter>,
    );
    expect(within(pane()).getByRole("button", { name: "Tìm kiếm (Ctrl+F)" })).toBeDisabled();
  });
});

describe("JSON editor: tree keyboard", () => {
  it("moves the selection with the arrow keys", async () => {
    const user = userEvent.setup();
    const tree = await openTree(user);
    tree.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    const selected = within(tree)
      .getAllByRole("treeitem")
      .filter((item) => item.getAttribute("aria-selected") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent("name");
    await user.keyboard("{Home}");
    expect(
      within(tree)
        .getAllByRole("treeitem")
        .find((item) => item.getAttribute("aria-selected") === "true"),
    ).toHaveTextContent("root");
  });
});

describe("JSON editor: files and copy", () => {
  const file = (content: string, name = "a.json") =>
    new File([content], name, { type: "application/json" });
  const picker = () => pane().querySelector<HTMLInputElement>('input[type="file"]')!;

  it("opens a JSON file into the pane", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <JsonFormatter />
      </MemoryRouter>,
    );
    await user.upload(picker(), file('{"x":1}'));
    expect(await within(pane()).findByDisplayValue('{"x":1}')).toBeInTheDocument();
  });

  it("rejects binary and oversized files and keeps the current text", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(
      <MemoryRouter>
        <JsonFormatter />
      </MemoryRouter>,
    );
    fireEvent.change(input(), { target: { value: "[1]" } });
    await user.upload(picker(), file("a\u0000b"));
    expect(await within(pane()).findByRole("alert")).toHaveTextContent("không phải văn bản UTF-8");
    expect(input()).toHaveValue("[1]");

    const huge = file("{}");
    Object.defineProperty(huge, "size", { value: 26 * 1024 * 1024 });
    await user.upload(picker(), huge);
    expect(await within(pane()).findByRole("alert")).toHaveTextContent("tối đa 25 MB");
    expect(input()).toHaveValue("[1]");
  });

  it("copies the path of the selected node from the Copy menu", async () => {
    const user = userEvent.setup();
    await openTree(user);
    await goPath(user, "sections[1].id");
    await user.click(within(pane()).getByRole("button", { name: "Copy" }));
    await user.click(screen.getByRole("menuitem", { name: "Copy đường dẫn nút" }));
    expect(await navigator.clipboard.readText()).toBe("sections[1].id");
  });

  it("copies the minified text from the Copy menu", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <JsonFormatter />
      </MemoryRouter>,
    );
    fireEvent.change(input(), { target: { value: '{ "a": [ 1, 2 ] }' } });
    await user.click(within(pane()).getByRole("button", { name: "Copy" }));
    await user.click(screen.getByRole("menuitem", { name: "Copy bản nén" }));
    expect(await navigator.clipboard.readText()).toBe('{"a":[1,2]}');
  });
});

describe("JSON editor: editing in the tree", () => {
  const SIMPLE = '{"count":5,"on":true,"s":"a"}';
  const doc = () => JSON.parse((input() as HTMLTextAreaElement).value);
  const keys = () => Object.keys(doc());
  const tree = () => within(pane()).getByRole("tree");
  const select = async (user: ReturnType<typeof userEvent.setup>, text: string) =>
    user.click(within(tree()).getByText(text));
  const choose = async (user: ReturnType<typeof userEvent.setup>, item: string) => {
    await user.click(within(pane()).getByRole("button", { name: "Thao tác trên nút" }));
    await user.click(screen.getByRole("menuitem", { name: item }));
  };

  it("edits a string value in place with a double-click and Enter", async () => {
    const user = userEvent.setup();
    await openTree(user, SIMPLE);
    await user.dblClick(within(tree()).getByText('"a"'));
    const box = within(pane()).getByRole("textbox", { name: "Giá trị của s" });
    await user.clear(box);
    await user.type(box, "new text{Enter}");
    expect(doc()).toEqual({ count: 5, on: true, s: "new text" });
    expect(within(tree()).getByText('"new text"')).toBeInTheDocument();
    expect((input() as HTMLTextAreaElement).value).toContain('\n  "s": "new text"');
  });

  it("rejects a bad number, keeps the text, and Esc cancels", async () => {
    const user = userEvent.setup();
    await openTree(user, SIMPLE);
    await user.dblClick(within(tree()).getByText("5"));
    const box = within(pane()).getByRole("textbox", { name: "Giá trị của count" });
    await user.clear(box);
    await user.type(box, "abc{Enter}");
    expect(await within(pane()).findByRole("alert")).toHaveTextContent(
      "Không phải số JSON hợp lệ.",
    );
    expect(input()).toHaveValue(SIMPLE);
    await user.keyboard("{Escape}");
    expect(within(pane()).queryByRole("textbox", { name: "Giá trị của count" })).toBeNull();
    expect(input()).toHaveValue(SIMPLE);
  });

  it("switches a boolean with the select", async () => {
    const user = userEvent.setup();
    await openTree(user, SIMPLE);
    await user.dblClick(within(tree()).getByText("true"));
    await user.selectOptions(
      within(pane()).getByRole("combobox", { name: "Giá trị của on" }),
      "false",
    );
    expect(doc().on).toBe(false);
  });

  it("does not rewrite the text when the value is left unchanged", async () => {
    const user = userEvent.setup();
    await openTree(user, SIMPLE);
    await user.dblClick(within(tree()).getByText("5"));
    await user.keyboard("{Enter}");
    expect(input()).toHaveValue(SIMPLE);
  });

  it("renames a key and refuses a name that is taken", async () => {
    const user = userEvent.setup();
    await openTree(user, SIMPLE);
    await user.dblClick(within(tree()).getByText("s"));
    const box = within(pane()).getByRole("textbox", { name: "Tên khóa của s" });
    await user.clear(box);
    await user.type(box, "count{Enter}");
    expect(await within(pane()).findByRole("alert")).toHaveTextContent("đã tồn tại");
    expect(keys()).toEqual(["count", "on", "s"] satisfies string[]);
    await user.clear(box);
    await user.type(box, "text{Enter}");
    expect(keys()).toEqual(["count", "on", "text"]);
  });

  it("removes, duplicates and changes the type from the node menu", async () => {
    const user = userEvent.setup();
    await openTree(user, SIMPLE);
    await select(user, "count");
    await choose(user, "Đổi kiểu thành chuỗi");
    expect(doc().count).toBe("5");
    await choose(user, "Nhân đôi");
    expect(keys()).toEqual(["count", "count_copy", "on", "s"]);
    await choose(user, "Xóa");
    expect(keys()).toEqual(["count", "on", "s"]);
  });

  it("inserts a new node and starts editing its key", async () => {
    const user = userEvent.setup();
    await openTree(user, SIMPLE);
    await select(user, "on");
    await choose(user, "Chèn sau");
    const box = within(pane()).getByRole("textbox", { name: "Tên khóa của newKey" });
    await user.type(box, "{Control>}a{/Control}extra{Enter}");
    expect(keys()).toEqual(["count", "on", "extra", "s"]);
    expect(doc().extra).toBe("");
  });

  it("adds a child to an empty array and edits it", async () => {
    const user = userEvent.setup();
    await openTree(user, '{"list":[]}');
    await select(user, "list");
    await choose(user, "Thêm phần tử con");
    await user.type(within(pane()).getByRole("textbox", { name: "Giá trị của 0" }), "x{Enter}");
    expect(doc()).toEqual({ list: ["x"] });
  });

  it("offers no menu entries that make no sense for the root", async () => {
    const user = userEvent.setup();
    await openTree(user, SIMPLE);
    await select(user, "root");
    await user.click(within(pane()).getByRole("button", { name: "Thao tác trên nút" }));
    expect(screen.queryByRole("menuitem", { name: "Xóa" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Chèn sau" })).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Thêm phần tử con" })).toBeInTheDocument();
  });

  it("supports Enter, Delete and Ctrl+D on the selected node", async () => {
    const user = userEvent.setup();
    await openTree(user, SIMPLE);
    await select(user, "count");
    await user.keyboard("{Control>}d{/Control}");
    expect(keys()).toEqual(["count", "count_copy", "on", "s"]);
    await user.keyboard("{Delete}"); // the copy is selected after duplicating
    expect(keys()).toEqual(["count", "on", "s"]);
    await select(user, "on");
    await user.keyboard("{Enter}");
    expect(within(pane()).getByRole("combobox", { name: "Giá trị của on" })).toBeInTheDocument();
  });

  it("stays read-only when a number would be rounded", async () => {
    const user = userEvent.setup();
    const text = '{"id":12345678901234567890,"a":1}';
    await openTree(user, text);
    expect(within(pane()).getByRole("note")).toHaveTextContent("vượt độ chính xác");
    await select(user, "a");
    expect(within(pane()).queryByRole("button", { name: "Thao tác trên nút" })).toBeNull();
    await user.dblClick(within(tree()).getByText("1"));
    expect(within(pane()).queryByRole("textbox", { name: "Giá trị của a" })).toBeNull();
    expect(input()).toHaveValue(text);
  });

  it("can dismiss the reformat note", async () => {
    const user = userEvent.setup();
    await openTree(user, SIMPLE);
    expect(within(pane()).getByRole("note")).toHaveTextContent("định dạng lại");
    await user.click(within(pane()).getByRole("button", { name: "Đóng" }));
    expect(within(pane()).queryByRole("note")).toBeNull();
  });
});
