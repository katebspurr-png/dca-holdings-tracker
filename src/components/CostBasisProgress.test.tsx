import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CostBasisProgress from "./CostBasisProgress";
import type { Holding } from "@/lib/storage";

const mockHoldingImproved: Holding = {
  id: "test-1",
  ticker: "AAPL",
  shares: 10,
  avg_cost: 120,
  initial_avg_cost: 150,
  current_price: 130,
  exchange: "US",
  fee_type: "flat",
  fee_value: 0,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const mockHoldingIncreased: Holding = {
  id: "test-2",
  ticker: "MSFT",
  shares: 5,
  avg_cost: 220,
  initial_avg_cost: 200,
  current_price: 210,
  exchange: "US",
  fee_type: "flat",
  fee_value: 0,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const mockHoldingEqual: Holding = {
  id: "test-3",
  ticker: "GOOGL",
  shares: 8,
  avg_cost: 100,
  initial_avg_cost: 100,
  current_price: 105,
  exchange: "US",
  fee_type: "flat",
  fee_value: 0,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

describe("CostBasisProgress", () => {
  it("renders cost basis progress section with proper aria landmark when cost basis improved", () => {
    render(<CostBasisProgress holding={mockHoldingImproved} currencyPrefix="$" />);

    const section = screen.getByRole("region", { name: "Cost Basis Progress" });
    expect(section).toBeInTheDocument();

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute("aria-label", "Cost basis average reduction progress");
    expect(progressbar).toHaveAttribute("aria-valuenow", "20");
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    expect(progressbar).toHaveAttribute("aria-valuetext", "20.0% reduction in average cost basis");

    expect(screen.getByText("Initial Avg")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
    expect(screen.getByText("Current Avg")).toBeInTheDocument();
    expect(screen.getByText("$120.00")).toBeInTheDocument();
    expect(screen.getByText("$300.00 lower")).toBeInTheDocument();
  });

  it("renders cost basis progress section when cost basis increased", () => {
    render(<CostBasisProgress holding={mockHoldingIncreased} currencyPrefix="$" />);

    const section = screen.getByRole("region", { name: "Cost Basis Progress" });
    expect(section).toBeInTheDocument();

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Your recorded average is above the initial snapshot (for example after buys at higher prices). This is informational only — not a gain or loss."
      )
    ).toBeInTheDocument();
  });

  it("returns null when current and initial cost basis are equal", () => {
    const { container } = render(<CostBasisProgress holding={mockHoldingEqual} currencyPrefix="$" />);
    expect(container).toBeEmptyDOMElement();
  });
});
