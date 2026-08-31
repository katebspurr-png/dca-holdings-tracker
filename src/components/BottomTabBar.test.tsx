import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
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
  it("renders navigation buttons with proper aria-labels and attributes", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const portfolioBtn = screen.getByRole("button", { name: /portfolio/i });
    const optimizerBtn = screen.getByRole("button", { name: /budget lab/i });
    const progressBtn = screen.getByRole("button", { name: /progress/i });
    const settingsBtn = screen.getByRole("button", { name: /settings/i });

    expect(portfolioBtn).toBeInTheDocument();
    expect(optimizerBtn).toBeInTheDocument();
    expect(progressBtn).toBeInTheDocument();
    expect(settingsBtn).toBeInTheDocument();
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

  it("triggers navigation when a tab is clicked", () => {
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
