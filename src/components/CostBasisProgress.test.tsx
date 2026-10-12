import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CostBasisProgress from "./CostBasisProgress";
import type { Holding } from "@/lib/storage";

describe("CostBasisProgress", () => {
  const baseHolding: Holding = {
    id: "h1",
    user_id: "u1",
    ticker: "AAPL",
    company_name: "Apple Inc.",
    shares: 10,
    avg_cost: 100,
    initial_avg_cost: 150,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  };

  it("returns null when initial_avg_cost is null or invalid or equal to avg_cost", () => {
    const { container: c1 } = render(
      <CostBasisProgress holding={{ ...baseHolding, initial_avg_cost: undefined }} currencyPrefix="$" />
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <CostBasisProgress holding={{ ...baseHolding, avg_cost: 150, initial_avg_cost: 150 }} currencyPrefix="$" />
    );
    expect(c2.firstChild).toBeNull();
  });

  it("renders cost reduction progress when avg_cost is lower than initial_avg_cost", () => {
    render(<CostBasisProgress holding={baseHolding} currencyPrefix="$" />);

    expect(screen.getByRole("region", { name: "Cost Basis Progress" })).toBeInTheDocument();
    expect(screen.getByText("Cost Basis Progress")).toBeInTheDocument();
    expect(screen.getByText("−33.3% avg")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
    expect(screen.getByText("$500.00 lower")).toBeInTheDocument();

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "33");
    expect(progressbar).toHaveAttribute(
      "aria-label",
      "Cost basis reduction progress: 33.3% lower average cost"
    );
  });

  it("renders informational notice when avg_cost is higher than initial_avg_cost", () => {
    const increasedHolding: Holding = {
      ...baseHolding,
      avg_cost: 180,
      initial_avg_cost: 150,
    };

    render(<CostBasisProgress holding={increasedHolding} currencyPrefix="$" />);

    expect(screen.getByRole("region", { name: "Cost Basis Progress" })).toBeInTheDocument();
    expect(screen.getByText("+20.0% avg")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
    expect(screen.getByText("$180.00")).toBeInTheDocument();
    expect(screen.getByText("$30.00")).toBeInTheDocument();
    expect(
      screen.getByText(/Your recorded average is above the initial snapshot/)
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
