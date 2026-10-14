import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import BottomTabBar from "./BottomTabBar";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe("BottomTabBar Component", () => {
  it("renders main navigation with tab items and aria-current on active tab", () => {
    const mockNavigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(nav).toBeInTheDocument();

    const portfolioBtn = screen.getByRole("button", { name: /portfolio/i });
    expect(portfolioBtn).toHaveAttribute("aria-current", "page");

    const optimizerBtn = screen.getByRole("button", { name: /budget lab/i });
    expect(optimizerBtn).not.toHaveAttribute("aria-current");
  });

  it("navigates when tab button is clicked", () => {
    const mockNavigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const settingsBtn = screen.getByRole("button", { name: /settings/i });
    fireEvent.click(settingsBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/settings");
  });
});
