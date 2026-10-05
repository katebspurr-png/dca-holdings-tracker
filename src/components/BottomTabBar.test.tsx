import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BottomTabBar from "./BottomTabBar";

describe("BottomTabBar", () => {
  it("renders navigation items and sets aria-current='page' on active item", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const portfolioBtn = screen.getByRole("button", { name: /portfolio/i });
    expect(portfolioBtn).toHaveAttribute("aria-current", "page");

    const settingsBtn = screen.getByRole("button", { name: /settings/i });
    expect(settingsBtn).not.toHaveAttribute("aria-current");
  });

  it("updates aria-current when route matches progress", () => {
    render(
      <MemoryRouter initialEntries={["/progress"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const progressBtn = screen.getByRole("button", { name: /progress/i });
    expect(progressBtn).toHaveAttribute("aria-current", "page");

    const portfolioBtn = screen.getByRole("button", { name: /portfolio/i });
    expect(portfolioBtn).not.toHaveAttribute("aria-current");
  });
});
