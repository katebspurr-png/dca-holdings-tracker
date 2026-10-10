import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import InsightsTab from "./InsightsTab";
import { SimFeesProvider } from "@/contexts/SimFeesContext";

vi.mock("@/hooks/use-pre-auth-save-upsell", () => ({
  usePreAuthSaveUpsell: () => ({
    requestPersist: (cb: () => void) => cb(),
    preAuthUpsellDialog: null,
  }),
}));

vi.mock("@/lib/storage", () => ({
  getHolding: vi.fn(),
  getScenariosForHolding: vi.fn(() => []),
  addScenario: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("InsightsTab component", () => {
  const mockHolding = {
    id: "h1",
    user_id: "u1",
    ticker: "AAPL",
    shares: 10,
    avg_cost: 150,
    fee_type: "flat",
    fee_value: 0,
    currency_symbol: "$",
    created_at: "2023-01-01",
    updated_at: "2023-01-01",
  };

  it("renders prompt to refresh market prices when marketPrice is null", () => {
    render(
      <SimFeesProvider>
        <InsightsTab
          holding={mockHolding}
          marketPrice={null}
          cp="$"
          onUseInCalculator={vi.fn()}
          onSaved={vi.fn()}
        />
      </SimFeesProvider>
    );

    expect(screen.getByText("Refresh market prices to unlock the Math tab.")).toBeInTheDocument();
  });

  it("renders sample rescue targets with contextual aria-labels", () => {
    const onUseInCalculator = vi.fn();
    const onSaved = vi.fn();

    render(
      <SimFeesProvider>
        <InsightsTab
          holding={mockHolding}
          marketPrice={100}
          cp="$"
          onUseInCalculator={onUseInCalculator}
          onSaved={onSaved}
        />
      </SimFeesProvider>
    );

    expect(screen.getByText("Target average — modeled capital")).toBeInTheDocument();

    const useCalcButtons = screen.getAllByRole("button", { name: /Use target average \$[0-9.]+ in calculator/i });
    expect(useCalcButtons.length).toBeGreaterThan(0);

    fireEvent.click(useCalcButtons[0]);
    expect(onUseInCalculator).toHaveBeenCalledWith("price_target", "100", expect.any(String));
  });

  it("associates custom target input label with input id", () => {
    render(
      <SimFeesProvider>
        <InsightsTab
          holding={mockHolding}
          marketPrice={100}
          cp="$"
          onUseInCalculator={vi.fn()}
          onSaved={vi.fn()}
        />
      </SimFeesProvider>
    );

    const input = screen.getByLabelText("Target average ($)");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("id", "custom-target-input");
  });
});
