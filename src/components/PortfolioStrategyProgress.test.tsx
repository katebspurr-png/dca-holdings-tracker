import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortfolioStrategyProgress } from "./PortfolioStrategyProgress";
import type { Holding } from "@/lib/storage";

describe("PortfolioStrategyProgress", () => {
  const sampleHoldings: Holding[] = [
    {
      id: "1",
      ticker: "AAPL",
      shares: 10,
      avg_cost: 140,
      initial_avg_cost: 150,
      current_price: 180,
      exchange: "US",
    },
    {
      id: "2",
      ticker: "SHOP",
      shares: 5,
      avg_cost: 70,
      initial_avg_cost: 80,
      current_price: 90,
      exchange: "TSX",
    },
    {
      id: "3",
      ticker: "MSFT",
      shares: 20,
      avg_cost: 300,
      initial_avg_cost: 300,
      current_price: 320,
      exchange: "US",
    },
  ];

  it("returns null when no holdings have an improved average cost", () => {
    const unimprovedHoldings: Holding[] = [
      {
        id: "1",
        ticker: "AAPL",
        shares: 10,
        avg_cost: 150,
        initial_avg_cost: 150,
        current_price: 180,
        exchange: "US",
      },
    ];

    const { container } = render(<PortfolioStrategyProgress holdings={unimprovedHoldings} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders section landmark with proper accessible heading association", () => {
    render(<PortfolioStrategyProgress holdings={sampleHoldings} />);

    const section = screen.getByRole("region", { name: "Progress vs initial snapshot" });
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute("aria-labelledby", "portfolio-strategy-progress-heading");

    const heading = screen.getByRole("heading", { level: 2, name: "Progress vs initial snapshot" });
    expect(heading).toHaveAttribute("id", "portfolio-strategy-progress-heading");
  });

  it("calculates and displays positions, avg reduction, and total cost basis reduction", () => {
    render(<PortfolioStrategyProgress holdings={sampleHoldings} />);

    expect(screen.getByText("2")).toBeInTheDocument(); // 2 improved positions
    expect(screen.getByText("US $10.00")).toBeInTheDocument();
    expect(screen.getByText("CAD C$10.00")).toBeInTheDocument();
    expect(screen.getByText("US $100.00")).toBeInTheDocument(); // 10 * (150 - 140)
    expect(screen.getByText("CAD C$50.00")).toBeInTheDocument(); // 5 * (80 - 70)
  });
});
