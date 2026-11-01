import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import Home from "./home";

const renderHome = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );

describe("Home", () => {
  it("renders a single h1 and lists every released tool as a link", () => {
    renderHome();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const list = screen.getByRole("region", { name: "Danh sách công cụ" });
    for (const name of ["JSON Formatter", "Base64", "JWT Decoder", "UUID Generator"]) {
      expect(within(list).getByRole("link", { name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it("filters by name, description or keyword and explains an empty result", async () => {
    const user = userEvent.setup();
    renderHome();
    await user.type(screen.getByRole("searchbox", { name: "Tìm công cụ" }), "guid");
    const list = screen.getByRole("region", { name: "Danh sách công cụ" });
    expect(within(list).getAllByRole("link")).toHaveLength(1);
    expect(within(list).getByRole("link", { name: /UUID Generator/ })).toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox", { name: "Tìm công cụ" }));
    await user.type(screen.getByRole("searchbox", { name: "Tìm công cụ" }), "zzzz");
    expect(screen.getByRole("status")).toHaveTextContent("Không có công cụ nào khớp");
  });
});
