import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Settings from "./Settings";
import * as storage from "@/lib/storage";

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    resetAll: vi.fn(),
    exportData: vi.fn(() => "{}"),
    importData: vi.fn(),
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}));

vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({ isDemoMode: false, exitDemo: vi.fn() }),
}));

vi.mock("@/contexts/ExperienceContext", () => ({
  useExperience: () => ({ resetGuidedDemo: vi.fn() }),
}));

describe("Settings - Destructive Reset Confirmation Dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call resetAll immediately when clicking the trigger button and instead opens the confirmation dialog", async () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const triggerBtn = screen.getByRole("button", { name: /clear portfolio/i });
    expect(triggerBtn).toBeInTheDocument();

    // Trigger button should have tactile and focus classes
    expect(triggerBtn.className).toContain("active:scale-95");

    // Click trigger
    fireEvent.click(triggerBtn);

    // resetAll should NOT have been called yet
    expect(storage.resetAll).not.toHaveBeenCalled();

    // Dialog title and description should be visible
    expect(screen.getByText("Clear entire portfolio?")).toBeInTheDocument();
    expect(
      screen.getByText(
        /This will permanently remove all holdings, transactions, and custom DCA scenarios/i
      )
    ).toBeInTheDocument();

    // Cancel button should exist
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    expect(cancelBtn).toBeInTheDocument();

    // Action button should exist
    const confirmBtn = screen.getByRole("button", { name: /clear portfolio/i, hidden: false });
    expect(confirmBtn).toBeInTheDocument();
  });

  it("dismisses the dialog without resetting when Cancel is clicked", async () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const triggerBtn = screen.getByRole("button", { name: /clear portfolio/i });
    fireEvent.click(triggerBtn);

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(storage.resetAll).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText("Clear entire portfolio?")).not.toBeInTheDocument();
    });
  });

  it("calls resetAll when confirmation is confirmed", async () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const triggerBtn = screen.getByRole("button", { name: /clear portfolio/i });
    fireEvent.click(triggerBtn);

    // Get the confirm button inside the dialog
    const actionButtons = screen.getAllByRole("button", { name: /clear portfolio/i });
    // The dialog action button
    const confirmBtn = actionButtons[actionButtons.length - 1];
    fireEvent.click(confirmBtn);

    expect(storage.resetAll).toHaveBeenCalledTimes(1);
  });
});
