import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetAppearance } from "../../lib/appearance-store";
import { AppearanceMenu } from "./AppearanceMenu";

const attrs = () =>
  Array.from(document.documentElement.attributes)
    .map((attribute) => attribute.name)
    .filter((name) => name.startsWith("data-ap-"));

beforeEach(() => {
  localStorage.clear();
  resetAppearance();
});
afterEach(() => resetAppearance());

type User = ReturnType<typeof userEvent.setup>;

// jsdom has no matchMedia, so the narrow variant (a dialog) is the one rendered.
const open = async (user: User) => {
  render(<AppearanceMenu />);
  await user.click(screen.getByRole("button", { name: "Tùy chỉnh màu giao diện" }));
  return screen.getByRole("dialog", { hidden: true });
};
const radio = (dialog: HTMLElement, name: string) =>
  within(dialog).getByRole("radio", { name, hidden: true });
const checkbox = (dialog: HTMLElement, name: string) =>
  within(dialog).getByRole("checkbox", { name, hidden: true });
const button = (dialog: HTMLElement, name: string) =>
  within(dialog).getByRole("button", { name, hidden: true });

describe("AppearanceMenu", () => {
  it("starts on the default look with the options off", async () => {
    const dialog = await open(userEvent.setup());
    expect(radio(dialog, "Mặc định")).toBeChecked();
    expect(checkbox(dialog, "Nền trang")).toBeDisabled();
    expect(button(dialog, "Đặt lại về mặc định")).toBeDisabled();
    expect(attrs()).toEqual([]);
  });

  it("applies a preset at once, enables the options and reports AA", async () => {
    const user = userEvent.setup();
    const dialog = await open(user);
    await user.click(radio(dialog, "Teal"));
    expect(radio(dialog, "Teal")).toBeChecked();
    expect(attrs()).toContain("data-ap-page");
    expect(checkbox(dialog, "Nền trang")).toBeEnabled();
    expect(within(dialog).getByText("Độ tương phản đạt chuẩn AA")).toBeInTheDocument();
  });

  it("switches a region off and the navigation to a dark style", async () => {
    const user = userEvent.setup();
    const dialog = await open(user);
    await user.click(radio(dialog, "Xanh dương"));
    await user.click(checkbox(dialog, "Nền trang"));
    expect(attrs()).not.toContain("data-ap-page");
    await user.click(radio(dialog, "Đậm"));
    expect(attrs()).toContain("data-ap-nav-solid");
    expect(attrs()).not.toContain("data-ap-nav");
  });

  it("takes a typed HEX code and reports a wrong one", async () => {
    const user = userEvent.setup();
    const dialog = await open(user);
    const field = within(dialog).getByRole("textbox", { name: "Mã màu (HEX)", hidden: true });
    await user.type(field, "#ff8800");
    expect(attrs()).toContain("data-ap-page");
    expect(radio(dialog, "Mặc định")).not.toBeChecked();

    await user.clear(field);
    await user.type(field, "#12");
    await user.tab();
    expect(await within(dialog).findByRole("alert", { hidden: true })).toHaveTextContent(
      "Mã màu không hợp lệ",
    );
    expect(field).toHaveAttribute("aria-invalid", "true");
  });

  it("goes back to the default look", async () => {
    const user = userEvent.setup();
    const dialog = await open(user);
    await user.click(radio(dialog, "Hồng"));
    await user.click(button(dialog, "Đặt lại về mặc định"));
    expect(attrs()).toEqual([]);
    expect(localStorage.getItem("devkit:v1:appearance")).toBeNull();
    expect(radio(dialog, "Mặc định")).toBeChecked();
  });

  it("shows a dot in the chosen colour on the button", async () => {
    const user = userEvent.setup();
    const dialog = await open(user);
    await user.click(radio(dialog, "Cam"));
    const trigger = screen.getByRole("button", { name: "Tùy chỉnh màu giao diện" });
    expect(trigger.querySelector("span[style]")).toHaveStyle({ backgroundColor: "#ea580c" });
  });
});
