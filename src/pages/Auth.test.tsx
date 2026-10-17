import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Auth from "./Auth";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    session: null,
    loading: false,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signInWithOtp: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}));

describe("Auth Page UX & Accessibility", () => {
  it("renders auth page with main CTA buttons and focus ring styles", () => {
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    const tryDemoButton = screen.getByRole("button", { name: /try demo/i });
    expect(tryDemoButton).toBeInTheDocument();
    expect(tryDemoButton.className).toContain("focus-visible:ring-2");
    expect(tryDemoButton.className).toContain("active:scale-95");

    const googleButton = screen.getByRole("button", { name: /continue with google/i });
    expect(googleButton).toBeInTheDocument();
    expect(googleButton.className).toContain("focus-visible:ring-2");
  });

  it("switches to signup mode when clicking create account toggle button", () => {
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    const createAccountToggle = screen.getByRole("button", { name: /^create account$/i });
    expect(createAccountToggle).toBeInTheDocument();
    expect(createAccountToggle.className).toContain("focus-visible:ring-2");

    fireEvent.click(createAccountToggle);

    expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
  });

  it("switches to forgot password mode and renders back button with focus styles", () => {
    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    const forgotBtn = screen.getByRole("button", { name: /forgot password\?/i });
    expect(forgotBtn).toBeInTheDocument();
    expect(forgotBtn.className).toContain("focus-visible:ring-2");

    fireEvent.click(forgotBtn);

    expect(screen.getByRole("heading", { name: /reset password/i })).toBeInTheDocument();

    const backBtn = screen.getByRole("button", { name: /back to sign in/i });
    expect(backBtn).toBeInTheDocument();
    expect(backBtn.className).toContain("focus-visible:ring-2");
  });
});
