import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WaitlistForm from "./WaitlistForm";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user_123", email: "test@example.com" } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

describe("WaitlistForm", () => {
  it("renders feature selection buttons with aria-pressed attributes", () => {
    render(<WaitlistForm defaultFeature="optimizer" />);

    const optimizerBtn = screen.getByRole("button", { name: /Compare allocations/i });
    expect(optimizerBtn).toHaveAttribute("aria-pressed", "true");

    const compareBtn = screen.getByRole("button", { name: /Scenario comparison/i });
    expect(compareBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles feature selection and beta tester state on click", () => {
    render(<WaitlistForm />);

    const compareBtn = screen.getByRole("button", { name: /Scenario comparison/i });
    expect(compareBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(compareBtn);
    expect(compareBtn).toHaveAttribute("aria-pressed", "true");

    const betaBtn = screen.getByRole("button", { name: /I'd like to be a beta tester/i });
    expect(betaBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(betaBtn);
    expect(betaBtn).toHaveAttribute("aria-pressed", "true");
  });
});
