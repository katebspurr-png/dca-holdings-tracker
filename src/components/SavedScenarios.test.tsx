import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SavedScenarios from "./SavedScenarios";
import * as storage from "@/lib/storage";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/lib/feature-access", () => ({
  hasFeature: () => true,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("SavedScenarios", () => {
  const mockScenario1: storage.Scenario = {
    id: "scen-1",
    holding_id: "holding-1",
    method: "price_shares",
    input1_value: 100,
    input2_value: 10,
    budget_invested: 1000,
    shares_to_buy: 10,
    buy_price: 100,
    new_avg_cost: 110,
    total_spend: 1000,
    notes: "Aggressive Buy Plan",
    created_at: new Date().toISOString(),
  };

  const mockScenario2: storage.Scenario = {
    id: "scen-2",
    holding_id: "holding-1",
    method: "price_budget",
    input1_value: 90,
    input2_value: 500,
    budget_invested: 500,
    shares_to_buy: 5.55,
    buy_price: 90,
    new_avg_cost: 105,
    total_spend: 500,
    notes: "Conservative Dip Buy",
    created_at: new Date(Date.now() - 10000).toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders filter chips with correct ARIA attributes and updates selection", () => {
    vi.spyOn(storage, "getScenariosForHolding").mockReturnValue([mockScenario1, mockScenario2]);

    render(
      <SavedScenarios
        holdingId="holding-1"
        exchange="US"
        onUseScenario={vi.fn()}
        onApplyBuy={vi.fn()}
        refreshKey={0}
        currentAvg={120}
        currencyPrefix="$"
      />
    );

    const filterGroup = screen.getByRole("group", { name: "Filter scenarios" });
    expect(filterGroup).toBeInTheDocument();

    const allChip = screen.getByRole("button", { name: /all/i });
    expect(allChip).toHaveAttribute("aria-pressed", "true");
    expect(allChip).toHaveAttribute("type", "button");

    const bestAvgChip = screen.getByRole("button", { name: /lowest new avg/i });
    expect(bestAvgChip).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(bestAvgChip);
    expect(bestAvgChip).toHaveAttribute("aria-pressed", "true");
    expect(allChip).toHaveAttribute("aria-pressed", "false");
  });

  it("renders scenario cards with explicit aria-labels on action buttons", () => {
    vi.spyOn(storage, "getScenariosForHolding").mockReturnValue([mockScenario1]);

    render(
      <SavedScenarios
        holdingId="holding-1"
        exchange="US"
        onUseScenario={vi.fn()}
        onApplyBuy={vi.fn()}
        refreshKey={0}
        currentAvg={120}
        currencyPrefix="$"
      />
    );

    const useBtn = screen.getByRole("button", { name: "Use scenario: Aggressive Buy Plan" });
    const deleteBtn = screen.getByRole("button", { name: "Delete scenario: Aggressive Buy Plan" });

    expect(useBtn).toBeInTheDocument();
    expect(deleteBtn).toBeInTheDocument();

    expect(useBtn.className).toContain("focus-visible:ring-2");
    expect(useBtn.className).toContain("active:scale-95");
  });

  it("supports keyboard toggling on cards in compare mode", () => {
    vi.spyOn(storage, "getScenariosForHolding").mockReturnValue([mockScenario1, mockScenario2]);

    render(
      <SavedScenarios
        holdingId="holding-1"
        exchange="US"
        onUseScenario={vi.fn()}
        onApplyBuy={vi.fn()}
        refreshKey={0}
        currentAvg={120}
        currencyPrefix="$"
      />
    );

    const compareBtn = screen.getByRole("button", { name: "Compare scenarios side-by-side" });
    fireEvent.click(compareBtn);

    const cardCheckbox1 = screen.getByRole("checkbox", {
      name: "Aggressive Buy Plan: $110.00 new average",
    });
    expect(cardCheckbox1).toHaveAttribute("aria-checked", "false");

    fireEvent.keyDown(cardCheckbox1, { key: "Enter" });
    expect(cardCheckbox1).toHaveAttribute("aria-checked", "true");

    fireEvent.keyDown(cardCheckbox1, { key: " " });
    expect(cardCheckbox1).toHaveAttribute("aria-checked", "false");
  });
});
