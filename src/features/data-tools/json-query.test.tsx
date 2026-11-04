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

const pane = () => screen.getByRole("region", { name: "Ô trái" });
const input = () =>
  within(pane()).getByRole("textbox", { name: "Ô nhập JSON" }) as HTMLTextAreaElement;
const show = (text: string) => {
  render(
    <MemoryRouter>
      <JsonFormatter />
    </MemoryRouter>,
  );
  fireEvent.change(input(), { target: { value: text } });
};

describe("JSON editor: Compass-style query", () => {
  const PEOPLE = JSON.stringify([
    { userName: "quan.mv", age: 30 },
    { userName: "Dev.Kit", age: 25 },
    { userName: "guest", age: 40 },
  ]);
  const rightArea = () =>
    within(screen.getByRole("region", { name: "Ô phải" })).getByRole("textbox", {
      name: "Kết quả JSON",
    }) as HTMLTextAreaElement;
  const box = (name: string) => within(pane()).getByRole("textbox", { name: `${name} · Ô trái` });
  // fireEvent: user.type would read "{" as a key name
  const type = (name: string, value: string) => fireEvent.change(box(name), { target: { value } });
  const queryButton = () => within(pane()).getByRole("button", { name: "Lọc theo object (Query)" });
  const openQuery = async (user: User, text = PEOPLE) => {
    show(text);
    // The button waits for the debounced validation of the text.
    await waitFor(() => expect(queryButton()).toBeEnabled());
    await user.click(queryButton());
  };
  const preview = () =>
    within(pane()).getByRole("textbox", {
      name: "Ô nhập JSON · Kết quả xem trước",
    }) as HTMLTextAreaElement;
  const names = (text: string) =>
    (JSON.parse(text) as Array<{ userName: string }>).map((d) => d.userName);

  it("filters by an object and shows the count and which array was used", async () => {
    const user = userEvent.setup();
    await openQuery(user);
    type("Filter", '{ userName: "quan.mv" }');
    expect(await within(pane()).findByText(/1 \/ 3 kết quả · Mảng: \$/)).toBeInTheDocument();
    expect(names(preview().value)).toEqual(["quan.mv"]);
    expect(input()).toHaveValue(PEOPLE); // the text is untouched until Apply
  });

  it("matches a RegExp and sorts and projects like Compass", async () => {
    const user = userEvent.setup();
    await openQuery(user);
    type("Filter", "{ userName: /^(dev|quan)/i }");
    type("Sort", "{ age: -1 }");
    type("Project", "{ userName: 1 }");
    await within(pane()).findByText(/2 \/ 3 kết quả/);
    expect(JSON.parse(preview().value)).toEqual([{ userName: "quan.mv" }, { userName: "Dev.Kit" }]);
  });

  it("Apply writes the result into the text and closes the bar; Cancel changes nothing", async () => {
    const user = userEvent.setup();
    await openQuery(user);
    type("Filter", "{ age: { $gte: 30 } }");
    await within(pane()).findByText(/2 \/ 3 kết quả/);
    await user.click(within(pane()).getByRole("button", { name: "Hủy" }));
    expect(input()).toHaveValue(PEOPLE);
    expect(within(pane()).queryByRole("textbox", { name: "Filter · Ô trái" })).toBeNull();

    await user.click(queryButton());
    type("Filter", "{ age: { $gte: 30 } }");
    await within(pane()).findByText(/2 \/ 3 kết quả/);
    await user.click(within(pane()).getByRole("button", { name: "Áp dụng" }));
    expect(names(input().value)).toEqual(["quan.mv", "guest"]);
    expect(within(pane()).queryByRole("textbox", { name: "Filter · Ô trái" })).toBeNull();
  });

  it("explains a mistake, does not offer Apply and closes with Esc", async () => {
    const user = userEvent.setup();
    await openQuery(user);
    type("Filter", "{ userName: ");
    expect(await within(pane()).findByRole("alert")).toHaveTextContent("Cú pháp không hợp lệ");
    expect(within(pane()).getByRole("button", { name: "Áp dụng" })).toBeDisabled();
    type("Filter", "{ $foo: 1 }");
    expect(await within(pane()).findByText(/Toán tử không hỗ trợ: \$foo/)).toBeInTheDocument();
    await user.click(box("Filter"));
    await user.keyboard("{Escape}");
    expect(within(pane()).queryByRole("textbox", { name: "Filter · Ô trái" })).toBeNull();
    expect(input()).toHaveValue(PEOPLE);
  });

  it("says so when the document has no array", async () => {
    const user = userEvent.setup();
    await openQuery(user, '{"a":1}');
    type("Filter", "{ a: 1 }");
    expect(await within(pane()).findByRole("alert")).toHaveTextContent("cần một mảng");
  });

  it("Transform applies the open query of the source pane and leaves the source alone", async () => {
    const user = userEvent.setup();
    await openQuery(user);
    type("Filter", "{ age: { $lt: 40 } }");
    await within(pane()).findByText(/2 \/ 3 kết quả/);
    await user.click(screen.getByRole("button", { name: "Transform sang ô phải" }));
    expect(names(rightArea().value)).toEqual(["quan.mv", "Dev.Kit"]);
    expect(rightArea().value).toContain('\n  {\n    "userName"');
    expect(input()).toHaveValue(PEOPLE);
  });

  it("Transform without a query just formats", async () => {
    const user = userEvent.setup();
    await openQuery(user);
    await user.click(within(pane()).getByRole("button", { name: "Hủy" }));
    await user.click(screen.getByRole("button", { name: "Transform sang ô phải" }));
    expect(names(rightArea().value)).toEqual(["quan.mv", "Dev.Kit", "guest"]);
  });

  it("is unavailable for an empty pane", () => {
    render(
      <MemoryRouter>
        <JsonFormatter />
      </MemoryRouter>,
    );
    expect(within(pane()).getByRole("button", { name: "Lọc theo object (Query)" })).toBeDisabled();
  });
});

describe("JSON editor: table", () => {
  const ROWS = JSON.stringify([
    { name: "b", age: 30 },
    { name: "a", age: 100 },
    { name: "c", age: 5 },
  ]);
  const openTable = async (user: User, text = ROWS) => {
    show(text);
    await user.click(within(pane()).getByRole("radio", { name: "Bảng" }));
    return within(pane()).getByRole("table");
  };
  const column = (table: HTMLElement, index: number) =>
    within(table)
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell")[index]!.textContent);

  it("sorts by a column, numbers by value, then descending, then back", async () => {
    const user = userEvent.setup();
    const table = await openTable(user);
    expect(column(table, 1)).toEqual(["30", "100", "5"]);
    await user.click(within(table).getByRole("button", { name: "age" }));
    expect(column(table, 1)).toEqual(["5", "30", "100"]);
    expect(within(table).getByRole("columnheader", { name: "age" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await user.click(within(table).getByRole("button", { name: "age" }));
    expect(column(table, 1)).toEqual(["100", "30", "5"]);
    await user.click(within(table).getByRole("button", { name: "age" }));
    expect(column(table, 1)).toEqual(["30", "100", "5"]);
    await user.click(within(table).getByRole("button", { name: "name" }));
    expect(column(table, 0)).toEqual(["a", "b", "c"]);
    expect(input()).toHaveValue(ROWS); // sorting is a view, not an edit
  });

  it("edits a cell in place, in the right row even when sorted", async () => {
    const user = userEvent.setup();
    const table = await openTable(user);
    await user.click(within(table).getByRole("button", { name: "age" }));
    await user.dblClick(within(table).getByText("100"));
    const box = within(table).getByRole("textbox", { name: "Giá trị ô age, dòng 1" });
    await user.clear(box);
    await user.type(box, "7{Enter}");
    expect(JSON.parse(input().value)[1]).toEqual({ name: "a", age: 7 });
    expect(within(pane()).queryByRole("textbox", { name: /Giá trị ô/ })).toBeNull();
  });

  it("rejects a bad value and keeps the cell open", async () => {
    const user = userEvent.setup();
    const table = await openTable(user);
    await user.dblClick(within(table).getByText("30"));
    const box = within(table).getByRole("textbox", { name: "Giá trị ô age, dòng 0" });
    await user.clear(box);
    await user.type(box, "x{Enter}");
    expect(await within(table).findByRole("alert")).toHaveTextContent("Không phải số JSON hợp lệ.");
    expect(input()).toHaveValue(ROWS);
  });

  it("moves with the arrow keys and edits with Enter", async () => {
    const user = userEvent.setup();
    const table = await openTable(user);
    await user.click(within(table).getByText("b"));
    within(pane()).getByRole("region", { name: "Bảng" }).focus();
    await user.keyboard("{ArrowDown}{ArrowRight}{Enter}");
    expect(
      within(table).getByRole("textbox", { name: "Giá trị ô age, dòng 1" }),
    ).toBeInTheDocument();
  });

  it("is read-only when a number would be rounded", async () => {
    const user = userEvent.setup();
    const table = await openTable(user, '[{"id":12345678901234567890}]');
    await user.dblClick(within(table).getByText("12345678901234567000"));
    expect(within(pane()).queryByRole("textbox", { name: /Giá trị ô/ })).toBeNull();
    expect(within(pane()).getByRole("note")).toHaveTextContent("vượt độ chính xác");
  });
});
