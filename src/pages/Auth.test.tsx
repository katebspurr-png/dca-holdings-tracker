import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import Auth from "./Auth";

// Mock AuthContext and Supabase client
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ session: null }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signInWithOtp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

describe("Auth component micro-UX & accessibility", () => {
  it("renders main semantic landmark element", () => {
    const { container } = render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>,
    );

    const mainElement = container.querySelector("main");
    expect(mainElement).not.toBeNull();
  });

  it("renders primary CTA and form controls with proper accessible text", () => {
    render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>,
    );

    expect(screen.getByRole("button", { name: /try demo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /email me a magic link/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
});
