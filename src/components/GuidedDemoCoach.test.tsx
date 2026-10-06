import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import GuidedDemoCoach from "./GuidedDemoCoach";

const mockAdvanceGuidedDemo = vi.fn();
const mockSkipGuidedDemo = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    session: null,
  }),
}));

vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({
    isDemoMode: true,
  }),
}));

vi.mock("@/contexts/ExperienceContext", () => ({
  useExperience: () => ({
    guidedDemoActive: true,
    guidedDemoStepIndex: 0,
    advanceGuidedDemo: mockAdvanceGuidedDemo,
    skipGuidedDemo: mockSkipGuidedDemo,
  }),
}));

describe("GuidedDemoCoach", () => {
  it("renders walkthrough region and interactive controls with accessibility features", () => {
    render(<GuidedDemoCoach />);

    const region = screen.getByRole("region", { name: "Demo walkthrough" });
    expect(region).toBeInTheDocument();

    const skipIconBtn = screen.getByRole("button", { name: "Skip walkthrough" });
    expect(skipIconBtn).toBeInTheDocument();
    expect(skipIconBtn.className).toContain("focus-visible:ring-2");
    expect(skipIconBtn.className).toContain("active:scale-95");

    const skipTextBtn = screen.getByRole("button", { name: "Skip" });
    expect(skipTextBtn).toBeInTheDocument();

    const nextBtn = screen.getByRole("button", { name: "Next" });
    expect(nextBtn).toBeInTheDocument();

    fireEvent.click(skipIconBtn);
    expect(mockSkipGuidedDemo).toHaveBeenCalledTimes(1);

    fireEvent.click(nextBtn);
    expect(mockAdvanceGuidedDemo).toHaveBeenCalledTimes(1);
  });
});
