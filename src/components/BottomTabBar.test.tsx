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
  it("renders main navigation landmark and tab items", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav).toBeInTheDocument();

    const tabs = screen.getAllByRole("button");
    expect(tabs).toHaveLength(4);
    expect(screen.getByRole("button", { name: /portfolio/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /budget lab/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /progress/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /settings/i })).toBeInTheDocument();
  });

  it("sets aria-current='page' on the active tab and navigates on click", () => {
    render(
      <MemoryRouter initialEntries={["/optimizer"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const portfolioTab = screen.getByRole("button", { name: /portfolio/i });
    const budgetTab = screen.getByRole("button", { name: /budget lab/i });

    expect(budgetTab).toHaveAttribute("aria-current", "page");
    expect(portfolioTab).not.toHaveAttribute("aria-current");

    fireEvent.click(portfolioTab);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
