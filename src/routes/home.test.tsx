import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./home";

describe("scaffold smoke test", () => {
  it("renders the Home placeholder with a single h1", () => {
    render(<Home />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "DevKit" })).toBeInTheDocument();
  });
});
