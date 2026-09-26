import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HoldingFormDialog from "./HoldingFormDialog";

describe("HoldingFormDialog", () => {
  it("renders Add Holding title and accessible controls when open", () => {
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
    expect(screen.getByRole("combobox", { name: "Stock exchange" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Trading fee type" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("renders loading state spinner and text when loading is true", () => {
    const handleOpenChange = vi.fn();
    const handleSubmit = vi.fn();

    render(
      <HoldingFormDialog
        open={true}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
        loading={true}
      />
    );

    expect(screen.getByRole("button", { name: /Adding.../i })).toBeDisabled();
  });

  it("renders Edit Holding title and Saving... text when initial and loading are true", () => {
    const handleOpenChange = vi.fn();
    const handleSubmit = vi.fn();
    const mockHolding = {
      id: "h1",
      ticker: "AAPL",
      exchange: "US" as const,
      shares: 10,
      avg_cost: 150,
      fee: 0,
      fee_type: "flat" as const,
      fee_value: 0,
      created_at: new Date().toISOString(),
    };

    render(
      <HoldingFormDialog
        open={true}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
        initial={mockHolding}
        loading={true}
      />
    );

    expect(screen.getByText("Edit Holding")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Saving.../i })).toBeDisabled();
  });
});
