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

describe("GuidedDemoCoach", () => {
  it("renders walkthrough step details and interactive buttons with accessibility attributes", () => {
    render(<GuidedDemoCoach />);

    const region = screen.getByRole("region", { name: "Demo walkthrough" });
    expect(region).toBeInTheDocument();

    const skipIconBtn = screen.getByRole("button", { name: "Skip walkthrough" });
    expect(skipIconBtn).toBeInTheDocument();

    const nextBtn = screen.getByRole("button", { name: "Next" });
    expect(nextBtn).toBeInTheDocument();

    fireEvent.click(nextBtn);
    expect(mockAdvance).toHaveBeenCalledTimes(1);

    fireEvent.click(skipIconBtn);
    expect(mockSkip).toHaveBeenCalledTimes(1);
  });
});
