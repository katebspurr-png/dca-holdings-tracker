import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CostBasisProgress from "./CostBasisProgress";
import type { Holding } from "@/lib/storage";

describe("CostBasisProgress", () => {
  const mockImprovedHolding: Holding = {
    id: "h1",
    user_id: "u1",
    ticker: "AAPL",
    shares: 100,
    avg_cost: 150,
    initial_avg_cost: 200,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockIncreasedHolding: Holding = {
    id: "h2",
    user_id: "u1",
    ticker: "GOOGL",
    shares: 50,
    avg_cost: 120,
    initial_avg_cost: 100,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("renders progressbar and calculates reduction percentage when cost basis improved", () => {
    render(<CostBasisProgress holding={mockImprovedHolding} currencyPrefix="$" />);

    expect(screen.getByRole("region", { name: /cost basis progress/i })).toBeInTheDocument();

    const progressbar = screen.getByRole("progressbar", { name: /cost basis reduction percentage/i });
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute("aria-valuenow", "25");
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");

    expect(screen.getByText("−25.0% avg")).toBeInTheDocument();
    expect(screen.getByText("$200.00")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
    expect(screen.getByText("$5,000.00 lower")).toBeInTheDocument();
  });

  it("renders informational notice when cost basis increased", () => {
    render(<CostBasisProgress holding={mockIncreasedHolding} currencyPrefix="$" />);

    expect(screen.getByText("+20.0% avg")).toBeInTheDocument();
    expect(
      screen.getByText(/Your recorded average is above the initial snapshot/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("returns null when initial_avg_cost is missing or equal to current avg_cost", () => {
    const unchangedHolding: Holding = {
      ...mockImprovedHolding,
      avg_cost: 200,
      initial_avg_cost: 200,
    };

    const { container } = render(
      <CostBasisProgress holding={unchangedHolding} currencyPrefix="$" />
    );
    expect(container.firstChild).toBeNull();
  });
});
