import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import GuidedDemoCoach from "./GuidedDemoCoach";
import { AuthProvider } from "@/contexts/AuthContext";
import { DemoModeProvider, useDemoMode } from "@/contexts/DemoModeContext";
import { ExperienceProvider } from "@/contexts/ExperienceContext";
import { useEffect } from "react";

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>
        <DemoModeProvider>
          <ExperienceProvider>{children}</ExperienceProvider>
        </DemoModeProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

function EnableDemoHelper() {
  const { enterDemo } = useDemoMode();
  useEffect(() => {
    enterDemo();
  }, [enterDemo]);
  return null;
}

describe("GuidedDemoCoach", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders guided demo coach overlay with accessible buttons when active", async () => {
    render(
      <TestWrapper>
        <EnableDemoHelper />
        <GuidedDemoCoach />
      </TestWrapper>,
    );

    const region = await screen.findByRole("region", { name: "Demo walkthrough" });
    expect(region).toBeInTheDocument();

    const skipButtons = screen.getAllByRole("button", { name: "Skip walkthrough" });
    expect(skipButtons.length).toBeGreaterThanOrEqual(1);

    const nextButton = screen.getByRole("button", { name: "Next step" });
    expect(nextButton).toBeInTheDocument();
  });
});
