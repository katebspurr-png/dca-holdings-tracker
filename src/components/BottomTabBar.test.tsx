import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BottomTabBar from "./BottomTabBar";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("BottomTabBar", () => {
  test("renders all main navigation tabs with proper ARIA attributes", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const portfolioBtn = screen.getByRole("button", { name: "Portfolio" });
    const optimizerBtn = screen.getByRole("button", { name: "Budget lab" });
    const progressBtn = screen.getByRole("button", { name: "Progress" });
    const settingsBtn = screen.getByRole("button", { name: "Settings" });

    expect(portfolioBtn).toBeInTheDocument();
    expect(optimizerBtn).toBeInTheDocument();
    expect(progressBtn).toBeInTheDocument();
    expect(settingsBtn).toBeInTheDocument();

    expect(portfolioBtn).toHaveAttribute("aria-current", "page");
    expect(optimizerBtn).not.toHaveAttribute("aria-current");
    expect(progressBtn).not.toHaveAttribute("aria-current");
    expect(settingsBtn).not.toHaveAttribute("aria-current");
  });

  test("triggers navigation when a tab is clicked", () => {
    mockNavigate.mockReset();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const settingsBtn = screen.getByRole("button", { name: "Settings" });
    fireEvent.click(settingsBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/settings");
  });
});
