import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HoldingFormDialog from "./HoldingFormDialog";

describe("HoldingFormDialog", () => {
  it("renders correctly in add mode and submits form data", () => {
    const handleOpenChange = vi.fn();
    const handleSubmit = vi.fn();

    render(
      <HoldingFormDialog
        open={true}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
      />
    );

    expect(screen.getByRole("heading", { name: /Add Holding/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Stock exchange/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Trading fee type/i)).toBeInTheDocument();

    const tickerInput = screen.getByLabelText(/Ticker/i);
    const sharesInput = screen.getByLabelText(/Shares/i);
    const avgCostInput = screen.getByLabelText(/Avg Cost/i);

    fireEvent.change(tickerInput, { target: { value: "aapl" } });
    fireEvent.change(sharesInput, { target: { value: "10" } });
    fireEvent.change(avgCostInput, { target: { value: "150" } });

    const submitBtn = screen.getByRole("button", { name: /^Add$/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith({
      ticker: "AAPL",
      exchange: "US",
      shares: 10,
      avg_cost: 150,
      fee: 0,
      fee_type: "flat",
      fee_value: 0,
    });
  });

  it("renders correctly in edit mode with initial values", () => {
    const initialHolding = {
      ticker: "TSLA",
      exchange: "US" as const,
      shares: 5,
      avg_cost: 200,
      fee: 2.5,
      fee_type: "flat" as const,
      fee_value: 2.5,
    };

    render(
      <HoldingFormDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        initial={initialHolding}
      />
    );

    expect(screen.getByRole("heading", { name: /Edit Holding/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Ticker/i)).toHaveValue("TSLA");
    expect(screen.getByLabelText(/Shares/i)).toHaveValue(5);
    expect(screen.getByLabelText(/Avg Cost/i)).toHaveValue(200);
    expect(screen.getByRole("button", { name: /^Save$/i })).toBeInTheDocument();
  });

  it("displays loading spinner when loading prop is true", () => {
    render(
      <HoldingFormDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        loading={true}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Add/i });
    expect(submitBtn).toBeDisabled();
  });
});
