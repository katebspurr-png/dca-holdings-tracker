import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CostBasisProgress from "./CostBasisProgress";
import type { Holding } from "@/lib/storage";

describe("CostBasisProgress", () => {
  it("renders progressbar with correct accessibility attributes when cost basis improved", () => {
    const mockHolding: Holding = {
      id: "h1",
      ticker: "AAPL",
      exchange: "NASDAQ",
      shares: 10,
      avg_cost: 150,
      initial_avg_cost: 200,
      market_price: 180,
      currency: "USD",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    render(<CostBasisProgress holding={mockHolding} currencyPrefix="$" />);

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeDefined();
    expect(progressbar.getAttribute("aria-label")).toBe("Cost basis reduction percentage");
    expect(progressbar.getAttribute("aria-valuenow")).toBe("25");
    expect(progressbar.getAttribute("aria-valuemin")).toBe("0");
    expect(progressbar.getAttribute("aria-valuemax")).toBe("100");
    expect(progressbar.getAttribute("aria-valuetext")).toBe("25.0% lower average cost basis");
  });

  it("returns null when no improvement or initial cost is not greater", () => {
    const mockHoldingNoDiff: Holding = {
      id: "h2",
      ticker: "AAPL",
      exchange: "NASDAQ",
      shares: 10,
      avg_cost: 200,
      initial_avg_cost: 200,
      market_price: 180,
      currency: "USD",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { container } = render(<CostBasisProgress holding={mockHoldingNoDiff} currencyPrefix="$" />);
    expect(container.firstChild).toBeNull();
  });
});
