import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BottomTabBar from "./BottomTabBar";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("BottomTabBar", () => {
  it("renders main navigation with accessible labels and marks active tab with aria-current", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const nav = screen.getByRole("navigation", { name: /main navigation/i });
    expect(nav).toBeInTheDocument();

    const portfolioBtn = screen.getByRole("button", { name: "Portfolio" });
    const budgetLabBtn = screen.getByRole("button", { name: "Budget lab" });
    const progressBtn = screen.getByRole("button", { name: "Progress" });
    const settingsBtn = screen.getByRole("button", { name: "Settings" });

    expect(portfolioBtn).toHaveAttribute("aria-current", "page");
    expect(budgetLabBtn).not.toHaveAttribute("aria-current");
    expect(progressBtn).not.toHaveAttribute("aria-current");
    expect(settingsBtn).not.toHaveAttribute("aria-current");

    expect(portfolioBtn.className).toContain("focus-visible:ring-stitch-accent/50");
    expect(portfolioBtn.className).toContain("active:scale-95");
  });

  it("navigates when clicking a tab", () => {
    mockNavigate.mockClear();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const budgetLabBtn = screen.getByRole("button", { name: "Budget lab" });
    fireEvent.click(budgetLabBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/optimizer");
  });
});
