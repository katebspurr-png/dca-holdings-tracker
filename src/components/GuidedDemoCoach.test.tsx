import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import GuidedDemoCoach from "./GuidedDemoCoach";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ session: null }),
}));

vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({ isDemoMode: true }),
}));

vi.mock("@/contexts/ExperienceContext", () => ({
  useExperience: () => ({
    guidedDemoActive: true,
    guidedDemoStepIndex: 0,
    advanceGuidedDemo: vi.fn(),
    skipGuidedDemo: vi.fn(),
  }),
}));

describe("GuidedDemoCoach", () => {
  it("renders guided demo coach overlay with accessible region label and buttons", () => {
    render(<GuidedDemoCoach />);

    const region = screen.getByRole("region", { name: /demo walkthrough/i });
    expect(region).toBeInTheDocument();

    const skipButtons = screen.getAllByRole("button", { name: /skip walkthrough/i });
    expect(skipButtons.length).toBeGreaterThan(0);

    const nextButton = screen.getByRole("button", { name: /go to next step/i });
    expect(nextButton).toBeInTheDocument();
  });
});
