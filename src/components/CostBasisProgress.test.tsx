import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CostBasisProgress from "./CostBasisProgress";
import type { Holding } from "@/lib/storage";

const baseHolding: Holding = {
  id: "test-holding-1",
  ticker: "AAPL",
  exchange: "US",
  shares: 10,
  avg_cost: 120,
  initial_avg_cost: 150,
  fee: 0,
  fee_type: "flat",
  fee_value: 0,
  created_at: "2024-01-01T00:00:00Z",
};

describe("CostBasisProgress", () => {
  it("renders null if initial cost is invalid or 0", () => {
    const holdingInvalid = { ...baseHolding, initial_avg_cost: 0 };
    const { container } = render(
      <CostBasisProgress holding={holdingInvalid} currencyPrefix="$" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders null if cost difference is negligible", () => {
    const holdingSame = { ...baseHolding, avg_cost: 150, initial_avg_cost: 150 };
    const { container } = render(
      <CostBasisProgress holding={holdingSame} currencyPrefix="$" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders progress section with proper WAI-ARIA attributes when cost basis improved", () => {
    render(<CostBasisProgress holding={baseHolding} currencyPrefix="$" />);

    const section = screen.getByRole("region", { name: "Cost Basis Progress" });
    expect(section).toBeInTheDocument();

    const heading = screen.getByText("Cost Basis Progress");
    expect(heading).toHaveAttribute("id", "cost-basis-progress-heading");

    const progressBar = screen.getByRole("progressbar", {
      name: "Cost basis reduction progress",
    });
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute("aria-valuenow", "20");
    expect(progressBar).toHaveAttribute("aria-valuetext", "20.0% lower average");

    expect(screen.getByText("Saved / Share")).toBeInTheDocument();
    expect(screen.getByText(/300\.00 lower/i)).toBeInTheDocument();
  });

  it("renders informational note when current cost basis is higher than initial", () => {
    const holdingHigher = { ...baseHolding, avg_cost: 180, initial_avg_cost: 150 };
    render(<CostBasisProgress holding={holdingHigher} currencyPrefix="$" />);

    expect(
      screen.getByText(/Your recorded average is above the initial snapshot/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Increase / Share")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
