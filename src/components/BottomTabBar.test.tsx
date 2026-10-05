import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, useNavigate } from "react-router-dom";
import BottomTabBar from "./BottomTabBar";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe("BottomTabBar", () => {
  it("renders all navigation tab buttons with proper labels", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /portfolio/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /budget lab/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /progress/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /settings/i })).toBeInTheDocument();
  });

  it("sets aria-current='page' on the active route tab", () => {
    render(
      <MemoryRouter initialEntries={["/progress"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const progressBtn = screen.getByRole("button", { name: /progress/i });
    const portfolioBtn = screen.getByRole("button", { name: /portfolio/i });

    expect(progressBtn).toHaveAttribute("aria-current", "page");
    expect(portfolioBtn).not.toHaveAttribute("aria-current");
  });

  it("navigates to the corresponding path when tab button is clicked", () => {
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
