import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortfolioStrategyProgress } from "./PortfolioStrategyProgress";
import type { Holding } from "@/lib/storage";

describe("PortfolioStrategyProgress", () => {
  it("renders null when no holdings have avg_cost lower than initial_avg_cost", () => {
    const holdings: Holding[] = [
      {
        id: "1",
        ticker: "AAPL",
        shares: 10,
        avg_cost: 150,
        initial_avg_cost: 150,
        current_price: 160,
      },
      {
        id: "2",
        ticker: "GOOGL",
        shares: 5,
        avg_cost: 120,
        initial_avg_cost: 100,
        current_price: 130,
      },
    ];

    const { container } = render(<PortfolioStrategyProgress holdings={holdings} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders section landmark and metrics when improved holdings exist", () => {
    const holdings: Holding[] = [
      {
        id: "1",
        ticker: "AAPL",
        shares: 10,
        avg_cost: 140,
        initial_avg_cost: 150,
        current_price: 160,
        exchange: "US",
      },
      {
        id: "2",
        ticker: "SHOP",
        shares: 20,
        avg_cost: 80,
        initial_avg_cost: 90,
        current_price: 85,
        exchange: "TSX",
      },
    ];

    render(<PortfolioStrategyProgress holdings={holdings} />);

    const section = screen.getByRole("region", { name: /Progress vs initial snapshot/i });
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute("aria-labelledby", "portfolio-strategy-progress-heading");

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/US \$10\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/CAD C\$10\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/US \$100\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/CAD C\$200\.00/i)).toBeInTheDocument();
  });
});
