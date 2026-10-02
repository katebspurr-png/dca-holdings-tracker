import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import Settings from "./Settings";
import { BrowserRouter } from "react-router-dom";

// Mock dependencies
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

describe("Settings Page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders Settings page with accessible theme switch and buttons", () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const switchElement = screen.getByRole("switch", { name: "Toggle dark mode theme" });
    expect(switchElement).toBeInTheDocument();

    const importInput = screen.getByLabelText("Import data backup JSON file");
    expect(importInput).toBeInTheDocument();
    expect(importInput).toHaveAttribute("type", "file");
  });

  it("toggles dark mode when switch is clicked", () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const switchElement = screen.getByRole("switch", { name: "Toggle dark mode theme" });
    fireEvent.click(switchElement);

    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("allows toggling plan preview state", () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const togglePlanBtn = screen.getByRole("button", { name: /Enable premium preview/i });
    expect(togglePlanBtn).toBeInTheDocument();

    fireEvent.click(togglePlanBtn);

    const turnOffBtn = screen.getByRole("button", { name: /Turn off premium preview/i });
    expect(turnOffBtn).toBeInTheDocument();
  });
});
