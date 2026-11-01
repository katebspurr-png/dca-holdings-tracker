import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PortfolioStrategyProgress } from "./PortfolioStrategyProgress";
import type { Holding } from "@/lib/storage";

describe("PortfolioStrategyProgress", () => {
  it("renders null when no holdings have improved average cost", () => {
    const unimprovedHoldings: Holding[] = [
      {
        id: "h1",
        ticker: "AAPL",
        shares: 10,
        avg_cost: 150,
        initial_avg_cost: 150,
        exchange: "US",
        created_at: 1000,
      },
      {
        id: "h2",
        ticker: "MSFT",
        shares: 5,
        avg_cost: 320,
        initial_avg_cost: 300,
        exchange: "US",
        created_at: 1000,
      },
    ];

    const { container } = render(<PortfolioStrategyProgress holdings={unimprovedHoldings} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders section with accessible heading and aria-hidden icon when holdings are improved", () => {
    const holdings: Holding[] = [
      {
        id: "h1",
        ticker: "AAPL",
        shares: 10,
        avg_cost: 140,
        initial_avg_cost: 150,
        exchange: "US",
        created_at: 1000,
      },
      {
        id: "h2",
        ticker: "SHOP",
        shares: 20,
        avg_cost: 90,
        initial_avg_cost: 100,
        exchange: "TSX",
        created_at: 1000,
      },
    ];

    const { container } = render(<PortfolioStrategyProgress holdings={holdings} />);

    const section = container.querySelector("section");
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute("aria-labelledby", "progress-vs-initial-heading");

    const heading = screen.getByRole("heading", { level: 2, name: /progress vs initial snapshot/i });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveAttribute("id", "progress-vs-initial-heading");

    const svgIcon = container.querySelector("svg");
    expect(svgIcon).toBeInTheDocument();
    expect(svgIcon).toHaveAttribute("aria-hidden", "true");

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("US $10.00")).toBeInTheDocument();
    expect(screen.getByText("CAD C$10.00")).toBeInTheDocument();
    expect(screen.getByText("US $100.00")).toBeInTheDocument();
    expect(screen.getByText("CAD C$200.00")).toBeInTheDocument();
  });
});
