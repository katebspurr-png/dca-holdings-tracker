import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ScenarioCompare from "./ScenarioCompare";
import type { Scenario } from "@/lib/storage";

const sampleScenarios: Scenario[] = [
  {
    id: "scen-1",
    holding_id: "hold-1",
    method: "price_shares",
    input1_label: "Target Price",
    input1_value: 100,
    input2_label: "Shares to Buy",
    input2_value: 10,
    include_fees: true,
    shares_to_buy: 10,
    total_spend: 1000,
    fee_applied: 5,
    new_avg_cost: 120,
    new_total_shares: 110,
    created_at: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "scen-2",
    holding_id: "hold-1",
    method: "price_budget",
    input1_label: "Target Price",
    input1_value: 95,
    input2_label: "Budget",
    input2_value: 500,
    include_fees: false,
    shares_to_buy: 5.26,
    total_spend: 500,
    fee_applied: 0,
    new_avg_cost: 115,
    new_total_shares: 105.26,
    created_at: "2025-01-02T00:00:00.000Z",
  },
];

describe("ScenarioCompare Component", () => {
  it("renders scenario comparison header and method titles", () => {
    render(
      <ScenarioCompare
        scenarios={sampleScenarios}
        currentAvg={130}
        cp="$"
        onUseScenario={vi.fn()}
        onApplyBuy={vi.fn()}
      />
    );

    expect(screen.getByText("Scenario Comparison")).toBeInTheDocument();
    expect(screen.getByText("Price + Shares")).toBeInTheDocument();
    expect(screen.getByText("Price + Budget")).toBeInTheDocument();
  });

  it("triggers onUseScenario and onApplyBuy callbacks with correct scenario", () => {
    const handleUse = vi.fn();
    const handleApply = vi.fn();

    render(
      <ScenarioCompare
        scenarios={sampleScenarios}
        currentAvg={130}
        cp="$"
        onUseScenario={handleUse}
        onApplyBuy={handleApply}
      />
    );

    const useButton = screen.getByRole("button", { name: "Use scenario Price + Shares" });
    const applyButton = screen.getByRole("button", { name: "Apply scenario Price + Budget" });

    fireEvent.click(useButton);
    expect(handleUse).toHaveBeenCalledTimes(1);
    expect(handleUse).toHaveBeenCalledWith(sampleScenarios[0]);

    fireEvent.click(applyButton);
    expect(handleApply).toHaveBeenCalledTimes(1);
    expect(handleApply).toHaveBeenCalledWith(sampleScenarios[1]);
  });
});
