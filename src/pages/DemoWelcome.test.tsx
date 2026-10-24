import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DemoWelcome from "./DemoWelcome";
import { DEMO_WELCOME_DISMISSED_KEY } from "@/lib/demoWelcome";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("DemoWelcome", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  it("renders demo welcome heading, description, and feature list", () => {
    render(
      <MemoryRouter>
        <DemoWelcome />
      </MemoryRouter>,
    );

    expect(screen.getByText("Explore how PositionPilot works")).toBeInTheDocument();
    expect(
      screen.getByText("Sample data only — explore safely, then sign up when you want your own portfolio."),
    ).toBeInTheDocument();

    const featureList = screen.getByRole("list", { name: "What you can try in the demo" });
    expect(featureList).toBeInTheDocument();
    expect(screen.getByText("See a sample portfolio")).toBeInTheDocument();
    expect(screen.getByText("Understand your average cost and positioning")).toBeInTheDocument();
    expect(screen.getByText('Test "what-if" scenarios')).toBeInTheDocument();
    expect(screen.getByText("See how to improve your position over time")).toBeInTheDocument();
  });

  it("navigates to /demo and sets welcome dismissed when Enter Demo is clicked", () => {
    render(
      <MemoryRouter>
        <DemoWelcome />
      </MemoryRouter>,
    );

    const enterBtn = screen.getByRole("button", { name: "Enter Demo" });
    fireEvent.click(enterBtn);

    expect(localStorage.getItem(DEMO_WELCOME_DISMISSED_KEY)).toBe("1");
    expect(mockNavigate).toHaveBeenCalledWith("/demo", { replace: true });
  });

  it("navigates to /demo?skipWalkthrough=1 and sets welcome dismissed when Skip walkthrough is clicked", () => {
    render(
      <MemoryRouter>
        <DemoWelcome />
      </MemoryRouter>,
    );

    const skipBtn = screen.getByRole("button", { name: "Skip walkthrough" });
    fireEvent.click(skipBtn);

    expect(localStorage.getItem(DEMO_WELCOME_DISMISSED_KEY)).toBe("1");
    expect(mockNavigate).toHaveBeenCalledWith("/demo?skipWalkthrough=1", { replace: true });
  });
});
