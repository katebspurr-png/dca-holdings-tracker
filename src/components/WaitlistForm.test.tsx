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
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe("WaitlistForm", () => {
  it("renders feature choices as interactive ARIA checkboxes", () => {
    render(<WaitlistForm defaultFeature="optimizer" />);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);

    const firstOption = checkboxes[0];
    expect(firstOption).toHaveAttribute("aria-checked", "true");
  });

  it("toggles feature checkboxes when clicked", () => {
    render(<WaitlistForm defaultFeature="optimizer" />);

    const firstOption = screen.getAllByRole("checkbox")[0];
    expect(firstOption).toHaveAttribute("aria-checked", "true");

    fireEvent.click(firstOption);
    expect(firstOption).toHaveAttribute("aria-checked", "false");
  });

  it("renders beta tester option as a checkbox toggle", () => {
    render(<WaitlistForm />);

    const betaCheckbox = screen.getByRole("checkbox", {
      name: "I'd like to be a beta tester",
    });
    expect(betaCheckbox).toHaveAttribute("aria-checked", "false");

    fireEvent.click(betaCheckbox);
    expect(betaCheckbox).toHaveAttribute("aria-checked", "true");
  });

  it("renders primary action button with aria-label", () => {
    render(<WaitlistForm defaultFeature="optimizer" />);

    const submitBtn = screen.getByRole("button", {
      name: "Submit feature waitlist interest",
    });
    expect(submitBtn).toBeDefined();
    expect(submitBtn).not.toBeDisabled();
  });
});
