import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import BottomTabBar from "./BottomTabBar";

describe("BottomTabBar", () => {
  it("renders navigation tabs with accessibility attributes and marks active tab", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const portfolioTab = screen.getByRole("button", { name: "Portfolio" });
    const budgetLabTab = screen.getByRole("button", { name: "Budget lab" });
    const progressTab = screen.getByRole("button", { name: "Progress" });
    const settingsTab = screen.getByRole("button", { name: "Settings" });

    expect(portfolioTab).toHaveAttribute("aria-current", "page");
    expect(budgetLabTab).not.toHaveAttribute("aria-current");
    expect(progressTab).not.toHaveAttribute("aria-current");
    expect(settingsTab).not.toHaveAttribute("aria-current");
  });

  it("marks active page when on a sub-route or different tab", () => {
    render(
      <MemoryRouter initialEntries={["/optimizer"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const budgetLabTab = screen.getByRole("button", { name: "Budget lab" });
    expect(budgetLabTab).toHaveAttribute("aria-current", "page");
  });
});
