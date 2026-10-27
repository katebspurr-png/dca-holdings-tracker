import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import InsightsTab from "./InsightsTab";
import { SimFeesProvider } from "@/contexts/SimFeesContext";

const mockHolding = {
  id: "test-holding-1",
  ticker: "AAPL",
  name: "Apple Inc.",
  shares: 10,
  avg_cost: 150,
  fee_type: "flat",
  fee_value: 0,
  currency: "USD",
  exchange: "NASDAQ",
  notes: "",
  created_at: new Date().toISOString(),
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <SimFeesProvider>{ui}</SimFeesProvider>
    </BrowserRouter>
  );
}

describe("InsightsTab component", () => {
  it("renders prompt when marketPrice is null", () => {
    renderWithProviders(
      <InsightsTab
        holding={mockHolding}
        marketPrice={null}
        cp="$"
        onUseInCalculator={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    expect(
      screen.getByText("Refresh market prices to unlock the Math tab.")
    ).toBeInTheDocument();
  });

  it("renders target average samples, efficiency score, and custom target inputs when marketPrice is provided", () => {
    renderWithProviders(
      <InsightsTab
        holding={mockHolding}
        marketPrice={100}
        cp="$"
        onUseInCalculator={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    expect(screen.getByText("Target average — modeled capital")).toBeInTheDocument();
    expect(screen.getByText("Buy impact (fixed test buy)")).toBeInTheDocument();

    const customInput = screen.getByLabelText("Target average cost in $");
    expect(customInput).toBeInTheDocument();

    const calcBtn = screen.getByRole("button", { name: "Calculate custom target average" });
    expect(calcBtn).toBeInTheDocument();
    expect(calcBtn.className).toContain("focus-visible:ring-2");
    expect(calcBtn.className).toContain("active:scale-95");
  });

  it("handles custom rescue calculation and button interactions", () => {
    const onUseInCalculator = vi.fn();
    const onSaved = vi.fn();

    renderWithProviders(
      <InsightsTab
        holding={mockHolding}
        marketPrice={100}
        cp="$"
        onUseInCalculator={onUseInCalculator}
        onSaved={onSaved}
      />
    );

    const customInput = screen.getByLabelText("Target average cost in $");
    fireEvent.change(customInput, { target: { value: "120" } });

    const calcBtn = screen.getByRole("button", { name: "Calculate custom target average" });
    fireEvent.click(calcBtn);

    const useInCalcButtons = screen.getAllByRole("button", { name: /Use .* in calculator/i });
    expect(useInCalcButtons.length).toBeGreaterThan(0);

    fireEvent.click(useInCalcButtons[0]);
    expect(onUseInCalculator).toHaveBeenCalled();
  });
});
