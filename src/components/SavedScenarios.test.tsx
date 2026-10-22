import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SavedScenarios from "./SavedScenarios";
import { MemoryRouter } from "react-router-dom";
import type { Scenario } from "@/lib/storage";

const mockScenarios: Scenario[] = [
  {
    id: "scen-1",
    holding_id: "holding-1",
    exchange: "US",
    method: "price_budget",
    notes: "Plan A Buy Dip",
    created_at: "2025-01-01T10:00:00.000Z",
    input1_value: 100,
    input2_value: 500,
    shares_to_buy: 5,
    new_avg_cost: 95,
    total_spend: 500,
    budget_invested: 500,
  },
  {
    id: "scen-2",
    holding_id: "holding-1",
    exchange: "US",
    method: "price_shares",
    notes: "Plan B DCA 10 shares",
    created_at: "2025-01-02T10:00:00.000Z",
    input1_value: 90,
    input2_value: 10,
    shares_to_buy: 10,
    new_avg_cost: 92,
    total_spend: 900,
    budget_invested: 900,
  },
];

vi.mock("@/lib/storage", () => ({
  getScenariosForHolding: vi.fn(() => mockScenarios),
  removeScenario: vi.fn(),
}));

vi.mock("@/lib/feature-access", () => ({
  hasFeature: vi.fn(() => true),
}));

describe("SavedScenarios", () => {
  const onUseScenario = vi.fn();
  const onApplyBuy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders list of saved scenarios and filter chips with proper ARIA attributes", () => {
    render(
      <MemoryRouter>
        <SavedScenarios
          holdingId="holding-1"
          exchange="US"
          onUseScenario={onUseScenario}
          onApplyBuy={onApplyBuy}
          refreshKey={0}
          currentAvg={100}
          currencyPrefix="$"
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Plan A Buy Dip")).toBeInTheDocument();
    expect(screen.getByText("Plan B DCA 10 shares")).toBeInTheDocument();

    const allFilterBtn = screen.getByRole("button", { name: /filter scenarios by all/i });
    expect(allFilterBtn).toHaveAttribute("aria-pressed", "true");

    const lowestAvgBtn = screen.getByRole("button", { name: /filter scenarios by lowest new avg/i });
    expect(lowestAvgBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(lowestAvgBtn);
    expect(lowestAvgBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("handles scenario usage with action buttons", () => {
    render(
      <MemoryRouter>
        <SavedScenarios
          holdingId="holding-1"
          exchange="US"
          onUseScenario={onUseScenario}
          onApplyBuy={onApplyBuy}
          refreshKey={0}
          currentAvg={100}
          currencyPrefix="$"
        />
      </MemoryRouter>
    );

    const useBtn = screen.getByRole("button", { name: /use scenario: plan b dca 10 shares/i });
    expect(useBtn).toBeInTheDocument();

    fireEvent.click(useBtn);
    expect(onUseScenario).toHaveBeenCalledWith(mockScenarios[1]);
  });

  it("supports entering compare mode and toggling scenario checkbox selections via keyboard", () => {
    render(
      <MemoryRouter>
        <SavedScenarios
          holdingId="holding-1"
          exchange="US"
          onUseScenario={onUseScenario}
          onApplyBuy={onApplyBuy}
          refreshKey={0}
          currentAvg={100}
          currencyPrefix="$"
        />
      </MemoryRouter>
    );

    const compareBtn = screen.getByRole("button", { name: /compare saved scenarios side by side/i });
    fireEvent.click(compareBtn);

    const scenarioCheckboxes = screen.getAllByRole("checkbox");
    expect(scenarioCheckboxes).toHaveLength(2);
    expect(scenarioCheckboxes[0]).toHaveAttribute("aria-checked", "false");

    fireEvent.keyDown(scenarioCheckboxes[0], { key: "Enter" });
    expect(scenarioCheckboxes[0]).toHaveAttribute("aria-checked", "true");
  });
});
