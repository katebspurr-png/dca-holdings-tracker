import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("WaitlistForm component", () => {
  it("renders feature selection group with aria attributes", () => {
    render(<WaitlistForm defaultFeature="optimizer" />);

    const group = screen.getByRole("group", { name: /which features interest you most\?/i });
    expect(group).toBeInTheDocument();

    const optimizerCheckbox = screen.getByRole("checkbox", { name: /compare allocations/i });
    expect(optimizerCheckbox).toHaveAttribute("aria-checked", "true");

    const scenarioCompareCheckbox = screen.getByRole("checkbox", { name: /scenario comparison/i });
    expect(scenarioCompareCheckbox).toHaveAttribute("aria-checked", "false");
  });

  it("toggles feature selection and beta tester checkboxes on click", () => {
    render(<WaitlistForm />);

    const betaTesterCheckbox = screen.getByRole("checkbox", { name: /i'd like to be a beta tester/i });
    expect(betaTesterCheckbox).toHaveAttribute("aria-checked", "false");

    fireEvent.click(betaTesterCheckbox);
    expect(betaTesterCheckbox).toHaveAttribute("aria-checked", "true");

    const alertsCheckbox = screen.getByRole("checkbox", { name: /price threshold alerts/i });
    expect(alertsCheckbox).toHaveAttribute("aria-checked", "false");

    fireEvent.click(alertsCheckbox);
    expect(alertsCheckbox).toHaveAttribute("aria-checked", "true");
  });

  it("disables submit button when no feature is selected", () => {
    render(<WaitlistForm />);

    const submitButton = screen.getByRole("button", { name: /join the waitlist/i });
    expect(submitButton).toBeDisabled();
  });
});
