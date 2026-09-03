import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DemoModeBanner from "./DemoModeBanner";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({
    isDemoMode: true,
    exitDemo: vi.fn(),
    resetDemo: vi.fn(),
  }),
}));

vi.mock("@/contexts/ExperienceContext", () => ({
  useExperience: () => ({
    resetGuidedDemo: vi.fn(),
  }),
}));

describe("DemoModeBanner", () => {
  it("renders demo mode banner with accessibility attributes and ARIA labels", () => {
    render(
      <MemoryRouter>
        <DemoModeBanner />
      </MemoryRouter>
    );

    const statusBanner = screen.getByRole("status", { name: "Demo mode banner" });
    expect(statusBanner).toBeInTheDocument();

    const createPortfolioBtn = screen.getByRole("button", { name: "Create your own portfolio" });
    expect(createPortfolioBtn).toBeInTheDocument();

    const signInBtn = screen.getByRole("button", { name: "Sign in" });
    expect(signInBtn).toBeInTheDocument();

    const restartWalkthroughBtn = screen.getByRole("button", { name: "Restart walkthrough" });
    expect(restartWalkthroughBtn).toBeInTheDocument();

    const resetDemoBtn = screen.getByRole("button", { name: "Reset demo data" });
    expect(resetDemoBtn).toBeInTheDocument();

    const exitDemoBtn = screen.getByRole("button", { name: "Exit demo mode" });
    expect(exitDemoBtn).toBeInTheDocument();
  });
});
