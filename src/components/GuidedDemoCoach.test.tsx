import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import GuidedDemoCoach from "./GuidedDemoCoach";

const mockAdvance = vi.fn();
const mockSkip = vi.fn();

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
    advanceGuidedDemo: mockAdvance,
    skipGuidedDemo: mockSkip,
  }),
}));

describe("GuidedDemoCoach Component", () => {
  it("renders guided demo coach banner with accessible regions and buttons", () => {
    render(<GuidedDemoCoach />);

    const region = screen.getByRole("region", { name: "Demo walkthrough" });
    expect(region).toBeInTheDocument();

    const skipButtons = screen.getAllByRole("button", { name: "Skip walkthrough" });
    expect(skipButtons.length).toBeGreaterThan(0);

    const nextButton = screen.getByRole("button", { name: /Advance to step 2/ });
    expect(nextButton).toBeInTheDocument();
  });

  it("calls skipGuidedDemo when close or skip button is clicked", () => {
    render(<GuidedDemoCoach />);

    const skipButtons = screen.getAllByRole("button", { name: "Skip walkthrough" });
    fireEvent.click(skipButtons[0]!);
    expect(mockSkip).toHaveBeenCalledTimes(1);
  });

  it("calls advanceGuidedDemo when Next button is clicked", () => {
    render(<GuidedDemoCoach />);

    const nextButton = screen.getByRole("button", { name: /Advance to step 2/ });
    fireEvent.click(nextButton);
    expect(mockAdvance).toHaveBeenCalledTimes(1);
  });
});
