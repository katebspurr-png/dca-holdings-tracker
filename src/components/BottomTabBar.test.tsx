import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
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
  it("renders all bottom navigation tabs", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Portfolio" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Budget lab" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Progress" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });

  it("marks the active route with aria-current='page'", () => {
    render(
      <MemoryRouter initialEntries={["/optimizer"]}>
        <BottomTabBar />
      </MemoryRouter>,
    );

    const portfolioBtn = screen.getByRole("button", { name: "Portfolio" });
    const budgetLabBtn = screen.getByRole("button", { name: "Budget lab" });

    expect(budgetLabBtn).toHaveAttribute("aria-current", "page");
    expect(portfolioBtn).not.toHaveAttribute("aria-current");
  });

  it("navigates to selected route when tab button is clicked", () => {
    mockNavigate.mockReset();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>,
    );

    const progressBtn = screen.getByRole("button", { name: "Progress" });
    fireEvent.click(progressBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/progress");
  });
});
