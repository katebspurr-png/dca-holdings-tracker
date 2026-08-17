import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ScenarioCompare from "./ScenarioCompare";
import type { Scenario } from "@/lib/storage";

const mockScenario: Scenario = {
  id: "scen-1",
  holding_id: "hold-1",
  method: "price_shares",
  input1_label: "Target Price",
  input1_value: 150,
  input2_label: "Shares",
  input2_value: 10,
  include_fees: false,
  shares_to_buy: 10,
  total_spend: 1500,
  fee_applied: 0,
  new_total_shares: 110,
  new_avg_cost: 165,
  created_at: new Date().toISOString(),
};

describe("ScenarioCompare component", () => {
  test("renders action buttons with descriptive ARIA labels and handles click callbacks", () => {
    const handleUse = vi.fn();
    const handleApply = vi.fn();

    render(
      <ScenarioCompare
        scenarios={[mockScenario]}
        currentAvg={170}
        cp="$"
        onUseScenario={handleUse}
        onApplyBuy={handleApply}
      />
    );

    const useBtn = screen.getByRole("button", { name: "Use Price + Shares scenario" });
    const applyBtn = screen.getByRole("button", { name: "Apply Price + Shares buy transaction" });

    expect(useBtn).toBeInTheDocument();
    expect(applyBtn).toBeInTheDocument();

    fireEvent.click(useBtn);
    expect(handleUse).toHaveBeenCalledWith(mockScenario);

    fireEvent.click(applyBtn);
    expect(handleApply).toHaveBeenCalledWith(mockScenario);
  });
});
