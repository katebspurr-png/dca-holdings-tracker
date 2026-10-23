import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import GuidedDemoCoach from "./GuidedDemoCoach";

const mockAdvanceGuidedDemo = vi.fn();
const mockSkipGuidedDemo = vi.fn();

let mockGuidedDemoActive = true;
let mockGuidedDemoStepIndex = 0;
let mockSession: unknown = null;
let mockIsDemoMode = true;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    session: mockSession,
  }),
}));

vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({
    isDemoMode: mockIsDemoMode,
  }),
}));

vi.mock("@/contexts/ExperienceContext", () => ({
  useExperience: () => ({
    guidedDemoActive: mockGuidedDemoActive,
    guidedDemoStepIndex: mockGuidedDemoStepIndex,
    advanceGuidedDemo: mockAdvanceGuidedDemo,
    skipGuidedDemo: mockSkipGuidedDemo,
  }),
}));

describe("GuidedDemoCoach", () => {
  it("renders null when guided demo is inactive", () => {
    mockGuidedDemoActive = false;
    const { container } = render(<GuidedDemoCoach />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders walkthrough region and interactive controls when active in demo mode", () => {
    mockGuidedDemoActive = true;
    mockGuidedDemoStepIndex = 0;
    mockSession = null;
    mockIsDemoMode = true;

    render(<GuidedDemoCoach />);

    const region = screen.getByRole("region", { name: "Demo walkthrough" });
    expect(region).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: "Skip walkthrough" });
    expect(closeBtn).toBeInTheDocument();

    const skipBtn = screen.getByRole("button", { name: "Skip" });
    const nextBtn = screen.getByRole("button", { name: "Next" });

    fireEvent.click(nextBtn);
    expect(mockAdvanceGuidedDemo).toHaveBeenCalledTimes(1);

    fireEvent.click(skipBtn);
    expect(mockSkipGuidedDemo).toHaveBeenCalledTimes(1);
  });
});
