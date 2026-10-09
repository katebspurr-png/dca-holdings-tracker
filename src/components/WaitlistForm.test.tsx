import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WaitlistForm from "./WaitlistForm";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
  }),
}));

const mockUpsert = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      upsert: mockUpsert,
    }),
  },
}));

describe("WaitlistForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders feature checkboxes with default feature selected", () => {
    render(<WaitlistForm defaultFeature="optimizer" />);

    const optimizerCheckbox = screen.getByRole("checkbox", { name: /Compare allocations/i });
    expect(optimizerCheckbox).toBeInTheDocument();
    expect(optimizerCheckbox).toHaveAttribute("aria-checked", "true");

    const betaCheckbox = screen.getByRole("checkbox", { name: /I'd like to be a beta tester/i });
    expect(betaCheckbox).toBeInTheDocument();
    expect(betaCheckbox).toHaveAttribute("aria-checked", "false");
  });

  it("toggles feature selection on click", () => {
    render(<WaitlistForm defaultFeature="optimizer" />);

    const optimizerCheckbox = screen.getByRole("checkbox", { name: /Compare allocations/i });
    fireEvent.click(optimizerCheckbox);
    expect(optimizerCheckbox).toHaveAttribute("aria-checked", "false");

    const submitBtn = screen.getByRole("button", { name: /Join the Waitlist/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.click(optimizerCheckbox);
    expect(optimizerCheckbox).toHaveAttribute("aria-checked", "true");
    expect(submitBtn).not.toBeDisabled();
  });

  it("toggles beta tester checkbox", () => {
    render(<WaitlistForm defaultFeature="optimizer" />);

    const betaCheckbox = screen.getByRole("checkbox", { name: /I'd like to be a beta tester/i });
    expect(betaCheckbox).toHaveAttribute("aria-checked", "false");

    fireEvent.click(betaCheckbox);
    expect(betaCheckbox).toHaveAttribute("aria-checked", "true");
  });

  it("submits waitlist selection successfully", async () => {
    render(<WaitlistForm defaultFeature="optimizer" />);

    const submitBtn = screen.getByRole("button", { name: /Join the Waitlist/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "test-user-id",
          email: "test@example.com",
          features: ["optimizer"],
          beta_tester: false,
        }),
        { onConflict: "email" }
      );
      expect(screen.getByText("You're on the list!")).toBeInTheDocument();
    });
  });
});
