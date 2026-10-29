import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HoldingFormDialog from "./HoldingFormDialog";

describe("HoldingFormDialog UX & Accessibility", () => {
  it("renders accessible ARIA labels on select triggers", () => {
    render(
      <HoldingFormDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const exchangeTrigger = screen.getByLabelText("Select exchange");
    expect(exchangeTrigger).toBeInTheDocument();

    const feeTypeTrigger = screen.getByLabelText("Select trading fee type");
    expect(feeTypeTrigger).toBeInTheDocument();
  });

  it("shows loading state with spinner and Adding... when adding new holding", () => {
    render(
      <HoldingFormDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        loading={true}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /adding/i });
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent("Adding...");
  });

  it("shows loading state with spinner and Saving... when editing initial holding", () => {
    const initialHolding = {
      id: "1",
      ticker: "AAPL",
      exchange: "US" as const,
      shares: 10,
      avg_cost: 150,
      initial_avg_cost: 150,
      fee: 0,
      fee_type: "flat" as const,
      fee_value: 0,
      created_at: "2024-01-01T00:00:00Z",
    };

    render(
      <HoldingFormDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        initial={initialHolding}
        loading={true}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /saving/i });
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent("Saving...");
  });
});
