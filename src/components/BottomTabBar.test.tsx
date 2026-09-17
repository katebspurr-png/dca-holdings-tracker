import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BottomTabBar from "./BottomTabBar";

describe("BottomTabBar component", () => {
  it("renders main navigation tabs and sets aria-current='page' on active route", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const portfolioButton = screen.getByRole("button", { name: "Portfolio" });
    const progressButton = screen.getByRole("button", { name: "Progress" });

    expect(portfolioButton).toHaveAttribute("aria-current", "page");
    expect(progressButton).not.toHaveAttribute("aria-current");
  });

  it("updates aria-current='page' when active route matches non-root route", () => {
    render(
      <MemoryRouter initialEntries={["/progress"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const portfolioButton = screen.getByRole("button", { name: "Portfolio" });
    const progressButton = screen.getByRole("button", { name: "Progress" });

    expect(portfolioButton).not.toHaveAttribute("aria-current");
    expect(progressButton).toHaveAttribute("aria-current", "page");
  });
});
