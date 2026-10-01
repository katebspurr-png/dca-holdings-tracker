import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import AuthResetPassword from "./AuthResetPassword";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      updateUser: vi.fn(() => Promise.resolve({ error: null })),
    },
  },
}));

describe("AuthResetPassword", () => {
  it("renders verifying reset link state when recovery hash is missing", () => {
    render(
      <MemoryRouter>
        <AuthResetPassword />
      </MemoryRouter>
    );

    const mainElement = screen.getByRole("main");
    expect(mainElement).toBeInTheDocument();
    expect(screen.getByText("Verifying reset link…")).toBeInTheDocument();
  });

  it("renders form controls and links with proper accessibility attributes when recovery hash is present", () => {
    window.location.hash = "#type=recovery";

    render(
      <MemoryRouter>
        <AuthResetPassword />
      </MemoryRouter>
    );

    const mainElement = screen.getByRole("main");
    expect(mainElement).toBeInTheDocument();

    const heading = screen.getByRole("heading", { level: 1, name: "Choose a new password" });
    expect(heading).toBeInTheDocument();

    const passwordInput = screen.getByLabelText("New password");
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("id", "new-password");

    const confirmInput = screen.getByLabelText("Confirm password");
    expect(confirmInput).toBeInTheDocument();
    expect(confirmInput).toHaveAttribute("id", "confirm-password");

    const submitButton = screen.getByRole("button", { name: "Update password" });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton.className).toContain("focus-visible:ring-2");
    expect(submitButton.className).toContain("active:scale-95");

    const backLink = screen.getByRole("link", { name: "Back to sign in" });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/auth");

    window.location.hash = "";
  });
});
