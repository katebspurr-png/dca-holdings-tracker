import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import WaitlistForm from "./WaitlistForm";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

describe("WaitlistForm", () => {
  it("renders with default feature checked and proper accessibility attributes", () => {
    render(<WaitlistForm defaultFeature="optimizer" />);

    const optimizerCheckbox = screen.getByRole("checkbox", {
      name: /Compare allocations/i,
    });
    expect(optimizerCheckbox).toBeInTheDocument();
    expect(optimizerCheckbox).toHaveAttribute("aria-checked", "true");

    const betaTesterCheckbox = screen.getByRole("checkbox", {
      name: /beta tester/i,
    });
    expect(betaTesterCheckbox).toBeInTheDocument();
    expect(betaTesterCheckbox).toHaveAttribute("aria-checked", "false");
  });

  it("toggles checkbox state when clicked", () => {
    render(<WaitlistForm defaultFeature="optimizer" />);

    const optimizerCheckbox = screen.getByRole("checkbox", {
      name: /Compare allocations/i,
    });
    expect(optimizerCheckbox).toHaveAttribute("aria-checked", "true");

    fireEvent.click(optimizerCheckbox);
    expect(optimizerCheckbox).toHaveAttribute("aria-checked", "false");

    const submitBtn = screen.getByRole("button", { name: /Join the Waitlist/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.click(optimizerCheckbox);
    expect(optimizerCheckbox).toHaveAttribute("aria-checked", "true");
    expect(submitBtn).not.toBeDisabled();
  });

  it("toggles beta tester option", () => {
    render(<WaitlistForm defaultFeature="optimizer" />);

    const betaCheckbox = screen.getByRole("checkbox", { name: /beta tester/i });
    expect(betaCheckbox).toHaveAttribute("aria-checked", "false");

    fireEvent.click(betaCheckbox);
    expect(betaCheckbox).toHaveAttribute("aria-checked", "true");
  });
});
