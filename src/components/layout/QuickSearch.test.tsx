import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { listedTools } from "../../registry/tools.meta";
import { QuickSearch } from "./QuickSearch";

const renderSearch = () =>
  render(
    <MemoryRouter>
      <QuickSearch tools={listedTools()} />
    </MemoryRouter>,
  );

describe("QuickSearch", () => {
  it("opens the menu on focus with parent groups and at most 10 rows", async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.click(screen.getByRole("combobox", { name: "Tìm nhanh trang" }));
    const list = screen.getByRole("listbox");
    expect(within(list).getByText("Dữ liệu")).toBeInTheDocument();
    const options = within(list).getAllByRole("option");
    const groups = list.querySelectorAll('[role="presentation"]');
    expect(options.length + groups.length).toBeLessThanOrEqual(10);
    expect(options.length).toBeGreaterThan(0);
  });

  it("opens with Ctrl+K and filters as you type, bringing a matching group's tools", async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.keyboard("{Control>}k{/Control}");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.keyboard("màu");
    const list = screen.getByRole("listbox");
    expect(within(list).getByText("Màu sắc")).toBeInTheDocument();
    expect(within(list).getByRole("option", { name: /Color Picker/ })).toBeInTheDocument();
    expect(within(list).queryByRole("option", { name: /JSON Formatter/ })).not.toBeInTheDocument();
  });

  it("says so when nothing matches", async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole("combobox"), "zzzz");
    expect(screen.getByRole("listbox")).toHaveTextContent("Không có công cụ nào khớp");
  });
});
