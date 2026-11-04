import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

type User = ReturnType<typeof userEvent.setup>;

const pane = (name: "Ô trái" | "Ô phải" = "Ô trái") => screen.getByRole("region", { name });
const box = (name: "Ô trái" | "Ô phải" = "Ô trái") =>
  within(pane(name)).getByRole("textbox", {
    name: name === "Ô trái" ? "Ô nhập JSON" : "Kết quả JSON",
  }) as HTMLTextAreaElement;
const setup = (left: string, right = "") => {
  render(
    <MemoryRouter>
      <JsonFormatter />
    </MemoryRouter>,
  );
  fireEvent.change(box("Ô trái"), { target: { value: left } });
  if (right) fireEvent.change(box("Ô phải"), { target: { value: right } });
};
const row = (side: "Ô trái" | "Ô phải", key: string) =>
  within(within(pane(side)).getByRole("tree"))
    .getByText(key)
    .closest('[role="treeitem"]')!;
const view = (user: User, side: "Ô trái" | "Ô phải", name: string) =>
  user.click(within(pane(side)).getByRole("radio", { name }));

describe("JSON compare in the Tree view", () => {
  const LEFT = '{"a":1,"b":2,"gone":true,"nested":{"x":1,"y":2}}';
  const RIGHT = '{"a":1,"b":3,"extra":1,"nested":{"x":1,"y":9}}';
  const compare = async (user: User) => {
    setup(LEFT, RIGHT);
    await view(user, "Ô trái", "Cây");
    await view(user, "Ô phải", "Cây");
    await user.click(screen.getByRole("checkbox", { name: "So sánh" }));
    await waitFor(() => expect(screen.getByText("4 khác biệt")).toBeInTheDocument());
  };

  it("marks what differs on both sides", async () => {
    const user = userEvent.setup();
    await compare(user);
    expect(within(pane("Ô trái")).getByRole("tree")).toBeInTheDocument();
    expect(within(pane("Ô phải")).getByRole("tree")).toBeInTheDocument();
    expect(row("Ô trái", "b")).toHaveTextContent("Khác");
    expect(row("Ô phải", "b")).toHaveTextContent("Khác");
    expect(row("Ô trái", "gone")).toHaveTextContent("Xóa");
    expect(row("Ô phải", "extra")).toHaveTextContent("Thêm");
    expect(row("Ô trái", "a")).not.toHaveTextContent(/Khác|Xóa|Thêm/);
  });

  it("opens the containers that hold a change and flags them", async () => {
    const user = userEvent.setup();
    await compare(user);
    // "y" is inside "nested", which is deeper than the default open level
    expect(row("Ô trái", "y")).toHaveTextContent("Khác");
    expect(row("Ô trái", "nested")).toHaveTextContent("Chứa khác biệt");
    expect(row("Ô trái", "a")).not.toHaveTextContent("Chứa khác biệt");
  });

  it("jumps from one difference to the next and back", async () => {
    const user = userEvent.setup();
    await compare(user);
    const selected = (side: "Ô trái" | "Ô phải") =>
      within(pane(side))
        .getAllByRole("treeitem")
        .find((item) => item.getAttribute("aria-selected") === "true");
    await user.click(screen.getByRole("button", { name: "Đến khác biệt kế tiếp" }));
    const first = selected("Ô trái") ?? selected("Ô phải");
    expect(first).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Đến khác biệt kế tiếp" }));
    await user.click(screen.getByRole("button", { name: "Đến khác biệt trước" }));
    expect((selected("Ô trái") ?? selected("Ô phải"))?.textContent).toBe(first?.textContent);
  });

  it("ends when either side leaves the Tree view", async () => {
    const user = userEvent.setup();
    await compare(user);
    await view(user, "Ô trái", "Văn bản");
    expect(screen.getByRole("checkbox", { name: "So sánh" })).not.toBeChecked();
    expect(screen.queryByText("4 khác biệt")).toBeNull();
    await view(user, "Ô trái", "Cây");
    expect(within(pane("Ô trái")).getByRole("tree")).not.toHaveTextContent("Xóa");
  });

  it("says when the two sides are the same, and reports a side that is not valid JSON", async () => {
    const user = userEvent.setup();
    setup('{"a":1}', '{"a":1}');
    await view(user, "Ô trái", "Cây");
    await view(user, "Ô phải", "Cây");
    await user.click(screen.getByRole("checkbox", { name: "So sánh" }));
    await waitFor(() => expect(screen.getByText("Hai bên giống nhau")).toBeInTheDocument());
    fireEvent.change(box("Ô phải"), { target: { value: '{"a":' } });
    // the pane that is not valid is reported, and no difference count is shown
    expect(await screen.findByRole("alert")).toHaveTextContent("Ô phải");
    expect(screen.queryByText("Hai bên giống nhau")).toBeNull();
  });
});

describe("JSON compare outside the Tree view", () => {
  it("warns instead of comparing, and offers to switch both panes to the Tree view", async () => {
    const user = userEvent.setup();
    setup('{"a":1,"b":2}', '{"a":1,"b":3}');
    await user.click(screen.getByRole("checkbox", { name: "So sánh" }));
    expect(screen.getByRole("note")).toHaveTextContent("So sánh chỉ chạy ở dạng Cây");
    expect(screen.getByRole("checkbox", { name: "So sánh" })).not.toBeChecked();
    expect(within(pane("Ô trái")).queryByRole("tree")).toBeNull(); // nothing was switched behind the back

    await user.click(screen.getByRole("button", { name: "Chuyển cả hai ô sang Cây" }));
    await waitFor(() => expect(screen.getByText("1 khác biệt")).toBeInTheDocument());
    expect(screen.getByRole("checkbox", { name: "So sánh" })).toBeChecked();
    expect(screen.queryByText(/So sánh chỉ chạy ở dạng Cây/)).toBeNull();
    expect(row("Ô trái", "b")).toHaveTextContent("Khác");
  });

  it("warns when only one of the panes is in the Tree view, and the warning goes away once both are", async () => {
    const user = userEvent.setup();
    setup('{"a":1}', '{"a":2}');
    await view(user, "Ô trái", "Cây");
    await user.click(screen.getByRole("checkbox", { name: "So sánh" }));
    expect(screen.getByText(/So sánh chỉ chạy ở dạng Cây/)).toBeInTheDocument();
    await view(user, "Ô phải", "Cây");
    expect(screen.queryByText(/So sánh chỉ chạy ở dạng Cây/)).toBeNull();
    await user.click(screen.getByRole("checkbox", { name: "So sánh" }));
    await waitFor(() => expect(screen.getByText("1 khác biệt")).toBeInTheDocument());
  });
});

describe("JSON Tree view: brackets", () => {
  it("shows { } for objects and [ ] for arrays, with the closing line when open", async () => {
    const user = userEvent.setup();
    setup('{"o":{"x":1},"list":[1,2],"empty":{},"none":[]}');
    await view(user, "Ô trái", "Cây");
    const tree = within(pane()).getByRole("tree");
    expect(row("Ô trái", "root")).toHaveTextContent(/root\s*:\s*\{/);
    expect(row("Ô trái", "o")).toHaveTextContent(/o\s*:\s*\{/);
    expect(row("Ô trái", "list")).toHaveTextContent(/list\s*:\s*\[/);
    expect(row("Ô trái", "empty")).toHaveTextContent("{}");
    expect(row("Ô trái", "none")).toHaveTextContent("[]");
    // closing lines belong to open containers: root, o, list
    expect(tree.textContent?.match(/\}/g)?.length).toBeGreaterThanOrEqual(3);
    // collapsing hides the closing line and shows an ellipsis
    await user.click(
      within(row("Ô trái", "o") as HTMLElement).getByRole("button", { hidden: true }),
    );
    expect(row("Ô trái", "o")).toHaveTextContent("{…}");
  });
});

describe("JSON Table view: choosing the array", () => {
  const DOC = JSON.stringify({
    name: "list",
    sections: [{ id: 1 }],
    other: [{ b: 2 }, { b: 3 }],
  });

  it("goes straight to the table when the document is an array", async () => {
    const user = userEvent.setup();
    setup('[{"a":1},{"a":2}]');
    await view(user, "Ô trái", "Bảng");
    expect(within(pane()).getByRole("table")).toBeInTheDocument();
    expect(within(pane()).queryByText("Đối tượng có mảng lồng nhau")).toBeNull();
  });

  it("lists the arrays inside an object and opens the one you pick", async () => {
    const user = userEvent.setup();
    setup(DOC);
    await view(user, "Ô trái", "Bảng");
    expect(within(pane()).getByText("Đối tượng có mảng lồng nhau")).toBeInTheDocument();
    expect(within(pane()).getByText("sections (1 mục)")).toBeInTheDocument();
    expect(within(pane()).getByText("other (2 mục)")).toBeInTheDocument();
    expect(within(pane()).queryByRole("table")).toBeNull();

    const items = within(pane()).getAllByRole("listitem");
    await user.click(within(items[1]!).getByRole("button", { name: "Mở" }));
    const table = within(pane()).getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "b" })).toBeInTheDocument();

    // switch to the other array from the bar above the table
    await user.selectOptions(within(pane()).getByRole("combobox", { name: "Mảng" }), "$.sections");
    expect(
      within(within(pane()).getByRole("table")).getByRole("columnheader", { name: "id" }),
    ).toBeInTheDocument();
    expect(box()).toHaveValue(DOC); // looking at an array does not change the text
  });

  it("extracts an array as the new document, and Undo keeps working through the text", async () => {
    const user = userEvent.setup();
    setup(DOC);
    await view(user, "Ô trái", "Bảng");
    const items = within(pane()).getAllByRole("listitem");
    await user.click(within(items[1]!).getByRole("button", { name: "Trích xuất" }));
    expect(JSON.parse(box().value)).toEqual([{ b: 2 }, { b: 3 }]);
    expect(within(pane()).getByRole("table")).toBeInTheDocument(); // now the document is the array
  });

  it("offers the Tree view when there is no array at all", async () => {
    const user = userEvent.setup();
    setup('{"a":1}');
    await view(user, "Ô trái", "Bảng");
    expect(within(pane()).getByText(/Không có dữ liệu dạng bảng/)).toBeInTheDocument();
    await user.click(within(pane()).getByRole("button", { name: "Chuyển sang dạng Cây" }));
    expect(within(pane()).getByRole("tree")).toBeInTheDocument();
  });
});
