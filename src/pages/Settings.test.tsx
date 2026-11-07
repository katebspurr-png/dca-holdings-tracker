import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Settings from "./Settings";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}));

vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({ isDemoMode: false, exitDemo: vi.fn() }),
}));

vi.mock("@/contexts/ExperienceContext", () => ({
  useExperience: () => ({ resetGuidedDemo: vi.fn() }),
}));

describe("Settings Page - Appearance Theme Toggles", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("renders light and dark toggle buttons with appropriate ARIA attributes", () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    const lightBtn = screen.getByRole("button", { name: /switch to light mode/i });
    const darkBtn = screen.getByRole("button", { name: /switch to dark mode/i });
    const switchToggle = screen.getByRole("switch", { name: /toggle dark mode/i });

    expect(lightBtn).toBeInTheDocument();
    expect(darkBtn).toBeInTheDocument();
    expect(switchToggle).toBeInTheDocument();
  });

  it("allows switching theme by clicking Light and Dark buttons directly", () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    const lightBtn = screen.getByRole("button", { name: /switch to light mode/i });
    const darkBtn = screen.getByRole("button", { name: /switch to dark mode/i });

    // Switch to dark mode
    fireEvent.click(darkBtn);
    expect(darkBtn).toHaveAttribute("aria-pressed", "true");
    expect(lightBtn).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");

    // Switch to light mode
    fireEvent.click(lightBtn);
    expect(lightBtn).toHaveAttribute("aria-pressed", "true");
    expect(darkBtn).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("updates Light and Dark button states when switch toggle is changed", () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    const lightBtn = screen.getByRole("button", { name: /switch to light mode/i });
    const darkBtn = screen.getByRole("button", { name: /switch to dark mode/i });
    const switchToggle = screen.getByRole("switch", { name: /toggle dark mode/i });

    fireEvent.click(switchToggle);
    // Whatever the switch toggled to, buttons reflect it
    const isDark = switchToggle.getAttribute("data-state") === "checked";
    expect(darkBtn).toHaveAttribute("aria-pressed", String(isDark));
    expect(lightBtn).toHaveAttribute("aria-pressed", String(!isDark));
  });
});
