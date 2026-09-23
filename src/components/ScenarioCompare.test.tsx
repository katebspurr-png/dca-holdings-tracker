import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ScenarioCompare from "./ScenarioCompare";
import { type Scenario } from "@/lib/storage";

describe("ScenarioCompare", () => {
  const mockScenarios: Scenario[] = [
    {
      id: "scen-1",
      holding_id: "hold-1",
      method: "price_shares",
      created_at: "2025-01-01T00:00:00Z",
      input1_label: "Price",
      input1_value: 100,
      input2_label: "Shares to Buy",
      input2_value: 10,
      shares_to_buy: 10,
      buy_price: 100,
      total_spend: 1000,
      new_avg_cost: 110,
      new_total_shares: 20,
      include_fees: false,
      fee_applied: 0,
    },
    {
      id: "scen-2",
      holding_id: "hold-1",
      method: "price_budget",
      created_at: "2025-01-02T00:00:00Z",
      input1_label: "Price",
      input1_value: 95,
      input2_label: "Budget",
      input2_value: 500,
      shares_to_buy: 5.2631,
      buy_price: 95,
      total_spend: 500,
      new_avg_cost: 105,
      new_total_shares: 15.2631,
      include_fees: false,
      fee_applied: 0,
    },
  ];

  it("renders scenario comparison table and method labels", () => {
    render(
      <ScenarioCompare
        scenarios={mockScenarios}
        currentAvg={120}
        cp="$"
        onUseScenario={vi.fn()}
        onApplyBuy={vi.fn()}
      />
    );

    expect(screen.getByText("Scenario Comparison")).toBeInTheDocument();
    expect(screen.getByText("Price + Shares")).toBeInTheDocument();
    expect(screen.getByText("Price + Budget")).toBeInTheDocument();
  });

  it("renders explicit aria-labels on action buttons and handles interactions", () => {
    const handleUse = vi.fn();
    const handleApply = vi.fn();

    render(
      <ScenarioCompare
        scenarios={mockScenarios}
        currentAvg={120}
        cp="$"
        onUseScenario={handleUse}
        onApplyBuy={handleApply}
      />
    );

    const useButtons = screen.getAllByRole("button", {
      name: /Use parameters from/i,
    });
    expect(useButtons).toHaveLength(2);
    expect(useButtons[0]).toHaveAttribute(
      "aria-label",
      "Use parameters from Price + Shares scenario"
    );

    const applyButtons = screen.getAllByRole("button", {
      name: /Apply buy order for/i,
    });
    expect(applyButtons).toHaveLength(2);
    expect(applyButtons[0]).toHaveAttribute(
      "aria-label",
      "Apply buy order for Price + Shares scenario"
    );

    fireEvent.click(useButtons[0]);
    expect(handleUse).toHaveBeenCalledWith(mockScenarios[0]);

    fireEvent.click(applyButtons[1]);
    expect(handleApply).toHaveBeenCalledWith(mockScenarios[1]);
  });
});
