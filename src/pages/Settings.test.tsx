import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Settings from "./Settings";
import { MemoryRouter } from "react-router-dom";

// Mock hooks and context providers as needed
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({
    isDemoMode: false,
    exitDemo: vi.fn(),
  }),
}));

vi.mock("@/contexts/ExperienceContext", () => ({
  useExperience: () => ({
    resetGuidedDemo: vi.fn(),
  }),
}));

describe("Settings Component", () => {
  it("renders dark mode switch with aria-label='Dark mode'", () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const switchEl = screen.getByRole("switch", { name: /dark mode/i });
    expect(switchEl).toBeInTheDocument();
  });

  it("toggles dark mode switch on click", () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const switchEl = screen.getByRole("switch", { name: /dark mode/i });
    const initialState = switchEl.getAttribute("aria-checked");

    fireEvent.click(switchEl);
    expect(switchEl.getAttribute("aria-checked")).not.toBe(initialState);
  });

  it("renders buttons with focus-visible and active press styling classes", () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const exportBtn = screen.getByRole("button", { name: /export data/i });
    expect(exportBtn.className).toContain("focus-visible:ring-2");
    expect(exportBtn.className).toContain("active:scale-95");
  });
});
