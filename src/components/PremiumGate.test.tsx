import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import PremiumGate, { PremiumBadge } from "./PremiumGate";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("PremiumGate Component", () => {
  it("renders feature title and description correctly", () => {
    render(
      <MemoryRouter>
        <PremiumGate feature="optimizer" />
      </MemoryRouter>,
    );

    expect(screen.getByText("Compare allocations")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open Settings for premium preview/i })).toBeInTheDocument();
  });

  it("renders title override if provided", () => {
    render(
      <MemoryRouter>
        <PremiumGate feature="optimizer" title="Custom Premium Title" />
      </MemoryRouter>,
    );

    expect(screen.getByText("Custom Premium Title")).toBeInTheDocument();
  });

  it("renders children behind gate with aria-hidden", () => {
    const { container } = render(
      <MemoryRouter>
        <PremiumGate feature="optimizer">
          <div data-testid="hidden-child">Secret Content</div>
        </PremiumGate>
      </MemoryRouter>,
    );

    const childContainer = container.querySelector(".blur-\\[1px\\]");
    expect(childContainer).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("hidden-child")).toBeInTheDocument();
  });

  it("navigates to settings when button is clicked", () => {
    render(
      <MemoryRouter>
        <PremiumGate feature="optimizer" />
      </MemoryRouter>,
    );

    const button = screen.getByRole("button", { name: /Open Settings for premium preview/i });
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith("/settings");
  });

  it("renders PremiumBadge with PRO text and aria-hidden icon", () => {
    const { container } = render(<PremiumBadge />);
    expect(screen.getByText("PRO")).toBeInTheDocument();
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
