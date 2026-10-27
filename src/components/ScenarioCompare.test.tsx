import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ScenarioCompare from "./ScenarioCompare";
import { type Scenario } from "@/lib/storage";

const mockScenarios: Scenario[] = [
  {
    id: "s1",
    holding_id: "h1",
    ticker: "AAPL",
    method: "price_shares",
    input1_label: "Buy Price",
    input1_value: 150,
    input2_label: "Shares",
    input2_value: 10,
    include_fees: false,
    new_avg_cost: 160,
    shares_to_buy: 10,
    total_spend: 1500,
    fee_applied: 0,
    new_total_shares: 110,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "s2",
    holding_id: "h1",
    ticker: "AAPL",
    method: "price_budget",
    input1_label: "Buy Price",
    input1_value: 140,
    input2_label: "Budget",
    input2_value: 700,
    include_fees: true,
    new_avg_cost: 155,
    shares_to_buy: 5,
    total_spend: 700,
    fee_applied: 2,
    new_total_shares: 105,
    created_at: "2025-01-02T00:00:00Z",
  },
];

describe("ScenarioCompare Component", () => {
  it("renders scenario headers, badges, and action buttons with accessible labels", () => {
    const handleUse = vi.fn();
    const handleApply = vi.fn();

    render(
      <ScenarioCompare
        scenarios={mockScenarios}
        currentAvg={170}
        cp="$"
        onUseScenario={handleUse}
        onApplyBuy={handleApply}
      />
    );

    expect(screen.getByText("Scenario Comparison")).toBeInTheDocument();
    expect(screen.getByText("Price + Shares")).toBeInTheDocument();
    expect(screen.getByText("Price + Budget")).toBeInTheDocument();

    const usePriceSharesBtn = screen.getByRole("button", { name: "Use Price + Shares scenario" });
    const applyPriceBudgetBtn = screen.getByRole("button", { name: "Apply buy from Price + Budget scenario" });

    expect(usePriceSharesBtn).toBeInTheDocument();
    expect(applyPriceBudgetBtn).toBeInTheDocument();
  });

  it("calls callbacks when action buttons are clicked", () => {
    const handleUse = vi.fn();
    const handleApply = vi.fn();

    render(
      <ScenarioCompare
        scenarios={mockScenarios}
        currentAvg={170}
        cp="$"
        onUseScenario={handleUse}
        onApplyBuy={handleApply}
      />
    );

    const usePriceSharesBtn = screen.getByRole("button", { name: "Use Price + Shares scenario" });
    fireEvent.click(usePriceSharesBtn);
    expect(handleUse).toHaveBeenCalledTimes(1);
    expect(handleUse).toHaveBeenCalledWith(mockScenarios[0]);

    const applyPriceBudgetBtn = screen.getByRole("button", { name: "Apply buy from Price + Budget scenario" });
    fireEvent.click(applyPriceBudgetBtn);
    expect(handleApply).toHaveBeenCalledTimes(1);
    expect(handleApply).toHaveBeenCalledWith(mockScenarios[1]);
  });
});
