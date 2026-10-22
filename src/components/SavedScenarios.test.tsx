import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SavedScenarios from "./SavedScenarios";
import * as storage from "@/lib/storage";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/lib/feature-access", () => ({
  hasFeature: () => true,
}));

describe("SavedScenarios Component UX & Accessibility", () => {
  const mockHoldingId = "holding-123";
  const mockScenarios: storage.Scenario[] = [
    {
      id: "scen-1",
      holding_id: mockHoldingId,
      created_at: new Date().toISOString(),
      method: "price_budget",
      input1_value: 150,
      budget_invested: 1000,
      shares_to_buy: 6.6667,
      new_avg_cost: 160,
      total_spend: 1000,
      notes: "Aggressive Buy Plan",
    },
    {
      id: "scen-2",
      holding_id: mockHoldingId,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      method: "price_shares",
      input1_value: 140,
      budget_invested: 700,
      shares_to_buy: 5,
      new_avg_cost: 155,
      total_spend: 700,
      notes: "Moderate Dip DCA",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders empty state when no scenarios exist", () => {
    vi.spyOn(storage, "getScenariosForHolding").mockReturnValue([]);

    render(
      <SavedScenarios
        holdingId={mockHoldingId}
        exchange="US"
        onUseScenario={vi.fn()}
        onApplyBuy={vi.fn()}
        refreshKey={0}
        currentAvg={170}
        currencyPrefix="$"
      />
    );

    expect(screen.getByText("No saved scenarios yet.")).toBeInTheDocument();
  });

  it("renders scenarios with accessibility labels and filter chip aria-pressed attributes", () => {
    vi.spyOn(storage, "getScenariosForHolding").mockReturnValue(mockScenarios);

    render(
      <SavedScenarios
        holdingId={mockHoldingId}
        exchange="US"
        onUseScenario={vi.fn()}
        onApplyBuy={vi.fn()}
        refreshKey={0}
        currentAvg={170}
        currencyPrefix="$"
      />
    );

    expect(screen.getByText("Aggressive Buy Plan")).toBeInTheDocument();
    expect(screen.getByText("Moderate Dip DCA")).toBeInTheDocument();

    const allFilterBtn = screen.getByRole("button", { name: /Sort scenarios by All/i });
    expect(allFilterBtn).toHaveAttribute("aria-pressed", "true");

    const bestAvgBtn = screen.getByRole("button", { name: /Sort scenarios by Lowest new avg/i });
    expect(bestAvgBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(bestAvgBtn);
    expect(bestAvgBtn).toHaveAttribute("aria-pressed", "true");

    const useBtn = screen.getByRole("button", { name: /Use scenario: Aggressive Buy Plan/i });
    expect(useBtn).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button", { name: /Delete scenario: Aggressive Buy Plan/i });
    expect(deleteBtn).toBeInTheDocument();
  });

  it("supports keyboard interaction and toggle selection in compare mode", () => {
    vi.spyOn(storage, "getScenariosForHolding").mockReturnValue(mockScenarios);

    render(
      <SavedScenarios
        holdingId={mockHoldingId}
        exchange="US"
        onUseScenario={vi.fn()}
        onApplyBuy={vi.fn()}
        refreshKey={0}
        currentAvg={170}
        currencyPrefix="$"
      />
    );

    const compareBtn = screen.getByRole("button", { name: /Compare saved scenarios/i });
    fireEvent.click(compareBtn);

    const scenarioCard = screen.getByRole("button", {
      name: /Select scenario Aggressive Buy Plan for comparison/i,
    });
    expect(scenarioCard).toHaveAttribute("aria-pressed", "false");

    fireEvent.keyDown(scenarioCard, { key: "Enter", code: "Enter" });
    expect(scenarioCard).toHaveAttribute("aria-pressed", "true");
  });
});
