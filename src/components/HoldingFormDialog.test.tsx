import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HoldingFormDialog from "./HoldingFormDialog";

describe("HoldingFormDialog Component", () => {
  it("renders Add Holding dialog when open and no initial values", () => {
    const handleOpenChange = vi.fn();
    const handleSubmit = vi.fn();

    render(
      <HoldingFormDialog
        open={true}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
      />
    );

    expect(screen.getByText("Add Holding")).toBeInTheDocument();
    expect(screen.getByLabelText(/Ticker/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Shares/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Avg Cost/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Stock exchange/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Trading fee type/i)).toBeInTheDocument();
  });

  it("populates initial values when editing a holding", () => {
    const handleOpenChange = vi.fn();
    const handleSubmit = vi.fn();

    const sampleHolding = {
      id: "h1",
      ticker: "AAPL",
      exchange: "US" as const,
      shares: 50,
      avg_cost: 175,
      fee: 4.99,
      fee_type: "flat" as const,
      fee_value: 4.99,
    };

    render(
      <HoldingFormDialog
        open={true}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
        initial={sampleHolding}
      />
    );

    expect(screen.getByText("Edit Holding")).toBeInTheDocument();
    expect(screen.getByLabelText(/Ticker/i)).toHaveValue("AAPL");
    expect(screen.getByLabelText(/Shares/i)).toHaveValue(50);
    expect(screen.getByLabelText(/Avg Cost/i)).toHaveValue(175);
    expect(screen.getByLabelText(/Trading fee value/i)).toHaveValue(4.99);
  });

  it("submits updated data when form is submitted", () => {
    const handleOpenChange = vi.fn();
    const handleSubmit = vi.fn();

    render(
      <HoldingFormDialog
        open={true}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/Ticker/i), {
      target: { value: "tsla" },
    });
    fireEvent.change(screen.getByLabelText(/Shares/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/Avg Cost/i), {
      target: { value: "200" },
    });

    const submitBtn = screen.getByRole("button", { name: "Add" });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith({
      ticker: "TSLA",
      exchange: "US",
      shares: 10,
      avg_cost: 200,
      fee: 0,
      fee_type: "flat",
      fee_value: 0,
    });
  });
});
