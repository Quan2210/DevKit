import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { JsonFormatter } from "../json-formatter/JsonFormatter";
import { XmlFormatter } from "../xml-formatter/XmlFormatter";
import { findTable, jsonToTree, xmlToTree } from "./model";

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

const renderTool = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);
const left = () => screen.getByRole("textbox", { name: /^(Ô nhập|Ô nhập JSON|Ô nhập XML)$/ });
const right = () => screen.getByRole("textbox", { name: /^(Kết quả JSON|Kết quả XML)$/ });
const typeLeft = (value: string) => fireEvent.change(left(), { target: { value } });
const typeRight = (value: string) => fireEvent.change(right(), { target: { value } });
const pane = (name: "Ô trái" | "Ô phải") => screen.getByRole("region", { name });
const press = async (name: string) => userEvent.click(screen.getByRole("button", { name }));

describe("JSON Formatter, two independent panes", () => {
  it("does not render one pane from the other until a button is pressed", async () => {
    renderTool(<JsonFormatter />);
    typeLeft('{"b":1,"a":[1,2]}');
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(right()).toHaveValue("");
    await press("Transform sang ô phải");
    expect(right()).toHaveValue('{\n  "b": 1,\n  "a": [\n    1,\n    2\n  ]\n}');
  });

  it("formats from the right pane into the left one with that pane's indent", async () => {
    const user = userEvent.setup();
    renderTool(<JsonFormatter />);
    typeRight('{"a":1}');
    await user.click(within(pane("Ô phải")).getByRole("radio", { name: "4 dấu cách" }));
    await user.click(screen.getByRole("button", { name: "Transform sang ô trái" }));
    expect(left()).toHaveValue('{\n    "a": 1\n}');
  });

  it("copies text unchanged in either direction", async () => {
    const user = userEvent.setup();
    renderTool(<JsonFormatter />);
    typeLeft('{ "keep":   "spacing" }');
    await user.click(screen.getByRole("button", { name: "Copy sang ô phải" }));
    expect(right()).toHaveValue('{ "keep":   "spacing" }');
    typeRight("[1]");
    await user.click(screen.getByRole("button", { name: "Copy sang ô trái" }));
    expect(left()).toHaveValue("[1]");
  });

  it("sorts keys deeply when the source pane has sorting on", async () => {
    const user = userEvent.setup();
    renderTool(<JsonFormatter />);
    typeLeft('{"b":1,"a":{"d":1,"c":2}}');
    await user.click(
      within(pane("Ô trái")).getByRole("button", { name: "Sắp xếp theo prop: tắt" }),
    );
    await user.click(screen.getByRole("button", { name: "Transform sang ô phải" }));
    expect(right()).toHaveValue('{\n  "a": {\n    "c": 2,\n    "d": 1\n  },\n  "b": 1\n}');
  });

  it("shows which pane is invalid and leaves the other pane alone", async () => {
    const user = userEvent.setup();
    renderTool(<JsonFormatter />);
    typeRight("keep");
    typeLeft('{"a":');
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Ô trái"));
    await user.click(screen.getByRole("button", { name: "Transform sang ô phải" }));
    expect(right()).toHaveValue("keep");
    expect(within(pane("Ô trái")).getByText("Không hợp lệ")).toBeInTheDocument();
  });

  it("clears one pane only", async () => {
    const user = userEvent.setup();
    renderTool(<JsonFormatter />);
    typeLeft("[1]");
    typeRight("[2]");
    await user.click(within(pane("Ô trái")).getByRole("button", { name: "Xóa" }));
    expect(left()).toHaveValue("");
    expect(right()).toHaveValue("[2]");
  });

  it("tree view shows item counts and an index for every array element", async () => {
    const user = userEvent.setup();
    renderTool(<JsonFormatter />);
    typeLeft('{"list":[{"id":1},{"id":2},{"id":3}]}');
    await user.click(within(pane("Ô trái")).getByRole("radio", { name: "Cây" }));
    const tree = within(pane("Ô trái")).getByRole("region", { name: "Cây" });
    expect(within(tree).getByText("3 mục")).toBeInTheDocument();
    for (const index of ["0", "1", "2"]) expect(within(tree).getByText(index)).toBeInTheDocument();
  });

  it("table view lists an array of objects and says so when there is no array", async () => {
    const user = userEvent.setup();
    renderTool(<JsonFormatter />);
    typeLeft('[{"id":1,"name":"a"},{"id":2,"extra":true}]');
    await user.click(within(pane("Ô trái")).getByRole("radio", { name: "Bảng" }));
    const table = within(pane("Ô trái")).getByRole("table");
    for (const column of ["id", "name", "extra"]) {
      expect(within(table).getByRole("columnheader", { name: column })).toBeInTheDocument();
    }
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    typeLeft('{"a":1}');
    expect(within(pane("Ô trái")).getByText(/Không có dữ liệu dạng bảng/)).toBeInTheDocument();
  });

  it("minify view shows the text compacted without changing it", async () => {
    const user = userEvent.setup();
    renderTool(<JsonFormatter />);
    typeLeft('{\n  "a": 1\n}');
    await user.click(within(pane("Ô trái")).getByRole("radio", { name: "Nén một dòng" }));
    expect(screen.getByRole("textbox", { name: /Nén một dòng/ })).toHaveValue('{"a":1}');
    await user.click(within(pane("Ô trái")).getByRole("radio", { name: "Văn bản" }));
    expect(left()).toHaveValue('{\n  "a": 1\n}');
  });

  it("minify view can be edited, and what is typed stays as typed", async () => {
    const user = userEvent.setup();
    renderTool(<JsonFormatter />);
    typeLeft('{"a":1}');
    await user.click(within(pane("Ô trái")).getByRole("radio", { name: "Nén một dòng" }));
    const box = screen.getByRole("textbox", { name: /Nén một dòng/ });
    fireEvent.change(box, { target: { value: '{"a": 2}' } }); // a space: not compact, still kept
    expect(box).toHaveValue('{"a": 2}');
    await user.click(within(pane("Ô trái")).getByRole("radio", { name: "Văn bản" }));
    expect(left()).toHaveValue('{"a": 2}');
  });

  describe("paste into a view that is not the text editor", () => {
    const paste = (target: HTMLElement, text: string) =>
      fireEvent.paste(target, { clipboardData: { getData: () => text } });

    it("shows pasted data in the Tree view right away", async () => {
      const user = userEvent.setup();
      renderTool(<JsonFormatter />);
      const radio = within(pane("Ô trái")).getByRole("radio", { name: "Cây" });
      await user.click(radio);
      expect(within(pane("Ô trái")).getByText(/Ctrl\+V/)).toBeInTheDocument();
      paste(radio, '{"name":"DevKit","n":[1,2]}'); // focus is on the toolbar, which counts
      const tree = within(pane("Ô trái")).getByRole("tree");
      expect(within(tree).getByText('"DevKit"')).toBeInTheDocument();
      expect(left()).toBeDefined();
    });

    it("shows pasted data in the Table and the compact views, replacing what was there", async () => {
      const user = userEvent.setup();
      renderTool(<JsonFormatter />);
      typeLeft('["old"]');
      const table = within(pane("Ô trái")).getByRole("radio", { name: "Bảng" });
      await user.click(table);
      paste(table, '[{"a":1},{"a":2}]');
      expect(within(pane("Ô trái")).getByRole("table")).toHaveTextContent("2");
      const compact = within(pane("Ô trái")).getByRole("radio", { name: "Nén một dòng" });
      await user.click(compact);
      paste(compact, '{\n  "b": 3\n}');
      expect(screen.getByRole("textbox", { name: /Nén một dòng/ })).toHaveValue('{"b":3}');
    });

    it("leaves a paste into an edit field alone", async () => {
      const user = userEvent.setup();
      renderTool(<JsonFormatter />);
      typeLeft('{"a":"x"}');
      await user.click(within(pane("Ô trái")).getByRole("radio", { name: "Cây" }));
      await user.dblClick(within(pane("Ô trái")).getByText('"x"'));
      const field = within(pane("Ô trái")).getByRole("textbox", { name: "Giá trị của a" });
      paste(field, '{"other":true}');
      expect(left()).toHaveValue('{"a":"x"}');
    });

    it("pasting something blank changes nothing", async () => {
      const user = userEvent.setup();
      renderTool(<JsonFormatter />);
      typeLeft("[1]");
      const radio = within(pane("Ô trái")).getByRole("radio", { name: "Cây" });
      await user.click(radio);
      paste(radio, "   ");
      expect(left()).toHaveValue("[1]");
    });
  });

  it("compares the two panes structurally and counts differences", async () => {
    const user = userEvent.setup();
    renderTool(<JsonFormatter />);
    typeLeft('{"a":1,"b":2}');
    typeRight('{"b":3,"a":1}');
    await user.click(within(pane("Ô trái")).getByRole("radio", { name: "Cây" }));
    await user.click(within(pane("Ô phải")).getByRole("radio", { name: "Cây" }));
    await user.click(screen.getByRole("checkbox", { name: "So sánh" }));
    await waitFor(() => expect(screen.getByText("1 khác biệt")).toBeInTheDocument());
    typeRight('{"b":2,"a":1}');
    await waitFor(() => expect(screen.getByText("Hai bên giống nhau")).toBeInTheDocument());
  });

  it("resizes the panes from the keyboard", async () => {
    const user = userEvent.setup();
    renderTool(<JsonFormatter />);
    const handle = screen.getByRole("slider", { name: "Kéo để đổi độ rộng hai ô" });
    expect(handle).toHaveAttribute("aria-valuenow", "50");
    handle.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(handle).toHaveAttribute("aria-valuenow", "54");
    await user.keyboard("{Home}");
    expect(handle).toHaveAttribute("aria-valuenow", "50");
  });
});

describe("XML Formatter, two independent panes", () => {
  const sample = '<?xml version="1.0"?><list><item id="1">a</item><item id="2">b</item></list>';

  it("formats between panes only on demand", async () => {
    renderTool(<XmlFormatter />);
    typeLeft("<a><b/></a>");
    expect(right()).toHaveValue("");
    await press("Format sang ô phải");
    expect(right().getAttribute("aria-label")).toBe("Kết quả XML");
    expect((right() as HTMLTextAreaElement).value).toContain("\n  <b/>");
  });

  it("flags a broken pane without touching the other", async () => {
    renderTool(<XmlFormatter />);
    typeLeft("<a><b></a>");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Ô trái"));
    await press("Format sang ô phải");
    expect(right()).toHaveValue("");
  });

  it("tree view numbers repeated elements and table view lists them as rows", async () => {
    const user = userEvent.setup();
    renderTool(<XmlFormatter />);
    typeLeft(sample);
    await user.click(within(pane("Ô trái")).getByRole("radio", { name: "Cây" }));
    const tree = within(pane("Ô trái")).getByRole("region", { name: "Cây" });
    expect(within(tree).getByText("0 / 2")).toBeInTheDocument();
    expect(within(tree).getByText("1 / 2")).toBeInTheDocument();
    await user.click(within(pane("Ô trái")).getByRole("radio", { name: "Bảng" }));
    const table = within(pane("Ô trái")).getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "@id" })).toBeInTheDocument();
    expect(within(table).getAllByRole("row")).toHaveLength(3);
  });

  it("warns when the declaration is not UTF-8", async () => {
    renderTool(<XmlFormatter />);
    typeLeft('<?xml version="1.0" encoding="ISO-8859-1"?><a/>');
    await waitFor(() => expect(screen.getByRole("note")).toHaveTextContent(/ISO-8859-1/));
  });

  it("offers a download only when the pane has text", async () => {
    renderTool(<XmlFormatter />);
    expect(within(pane("Ô phải")).getByRole("button", { name: "Tải .xml" })).toBeDisabled();
    typeRight("<a/>");
    expect(within(pane("Ô phải")).getByRole("button", { name: "Tải .xml" })).toBeEnabled();
  });
});

describe("tree and table model", () => {
  it("indexes array items and counts keys", () => {
    const tree = jsonToTree({ a: [10, 20], b: null });
    expect(tree.count).toBe(2);
    const array = tree.children![0]!;
    expect(array).toMatchObject({ kind: "array", count: 2 });
    expect(array.children!.map((child) => child.index)).toEqual([0, 1]);
    expect(tree.children![1]).toMatchObject({ kind: "null", value: "null" });
  });

  it("builds a table from the first array of rows and keeps scalars in a value column", () => {
    expect(findTable(jsonToTree([{ a: 1 }, { b: 2 }]))?.columns).toEqual(["a", "b"]);
    const scalars = findTable(jsonToTree({ list: [1, 2, 3] }));
    expect(scalars?.columns).toEqual(["value"]);
    expect(scalars?.rows.map((row) => row.cells[0])).toEqual(["1", "2", "3"]);
    expect(findTable(jsonToTree({ a: 1 }))).toBeNull();
  });

  it("turns XML attributes, text and repeated siblings into nodes", () => {
    const doc = new DOMParser().parseFromString(
      '<r><i k="1">x</i><i k="2">y</i></r>',
      "application/xml",
    );
    const tree = xmlToTree(doc.documentElement);
    const items = tree.children!.filter((child) => child.label === "i");
    expect(items.map((item) => item.index)).toEqual([0, 1]);
    expect(items[0]!.count).toBe(2);
    expect(items[0]!.children!.map((child) => child.label)).toEqual(["@k", "#text"]);
    expect(findTable(tree)?.columns).toEqual(["@k", "#text"]);
  });
});
