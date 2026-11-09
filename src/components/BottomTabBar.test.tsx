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

describe("BottomTabBar component", () => {
  it("renders all navigation tab buttons with accessible labels and marks the active tab with aria-current", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const portfolioBtn = screen.getByRole("button", { name: "Portfolio" });
    const budgetLabBtn = screen.getByRole("button", { name: "Budget lab" });
    const progressBtn = screen.getByRole("button", { name: "Progress" });
    const settingsBtn = screen.getByRole("button", { name: "Settings" });

    expect(portfolioBtn).toBeInTheDocument();
    expect(budgetLabBtn).toBeInTheDocument();
    expect(progressBtn).toBeInTheDocument();
    expect(settingsBtn).toBeInTheDocument();

    expect(portfolioBtn).toHaveAttribute("aria-current", "page");
    expect(budgetLabBtn).not.toHaveAttribute("aria-current");
    expect(progressBtn).not.toHaveAttribute("aria-current");
    expect(settingsBtn).not.toHaveAttribute("aria-current");
  });

  it("navigates to the corresponding path when clicked", () => {
    mockNavigate.mockClear();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Budget lab" }));
    expect(mockNavigate).toHaveBeenCalledWith("/optimizer");

    fireEvent.click(screen.getByRole("button", { name: "Progress" }));
    expect(mockNavigate).toHaveBeenCalledWith("/progress");

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(mockNavigate).toHaveBeenCalledWith("/settings");
  });
});
