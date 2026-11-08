import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import GoalLadder from "./GoalLadder";
import { SimFeesProvider } from "@/contexts/SimFeesContext";
import * as stockPriceModule from "@/lib/stock-price";
import type { Holding } from "@/lib/storage";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const sampleHolding: Holding = {
  id: "test-holding-1",
  user_id: "test-user",
  ticker: "AAPL",
  exchange: "US",
  shares: 10,
  avg_cost: 150,
  fee: 0,
  fee_type: "flat",
  fee_value: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function renderWithProviders(holding: Holding) {
  return render(
    <BrowserRouter>
      <SimFeesProvider>
        <GoalLadder holding={holding} />
      </SimFeesProvider>
    </BrowserRouter>
  );
}

describe("GoalLadder component UX & accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders prompt with accessible Update Prices button when price is missing", () => {
    vi.spyOn(stockPriceModule, "getCachedQuote").mockReturnValue(null);

    renderWithProviders(sampleHolding);

    expect(screen.getByText(/Budget-step simulator/i)).toBeInTheDocument();
    const updatePricesBtn = screen.getByRole("button", { name: "Navigate to update prices" });
    expect(updatePricesBtn).toBeInTheDocument();
    expect(updatePricesBtn).toHaveClass("focus-visible:ring-2");
    expect(updatePricesBtn).toHaveClass("active:scale-95");

    fireEvent.click(updatePricesBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/update-prices");
  });

  it("renders non-underwater state when current price is above average cost", () => {
    vi.spyOn(stockPriceModule, "getCachedQuote").mockReturnValue({
      price: 160,
      timestamp: Date.now(),
      change: 10,
      changesPercentage: 6.67,
    });

    renderWithProviders(sampleHolding);

    expect(
      screen.getByText(/Current price is at or above your average/i)
    ).toBeInTheDocument();
    const switchEl = screen.getByRole("switch", { name: "Include fees in ladder math" });
    expect(switchEl).toBeInTheDocument();
  });

  it("renders ladder simulator rungs and accessible fee toggle when underwater", () => {
    vi.spyOn(stockPriceModule, "getCachedQuote").mockReturnValue({
      price: 100,
      timestamp: Date.now(),
      change: -50,
      changesPercentage: -33.3,
    });

    renderWithProviders(sampleHolding);

    expect(screen.getByText(/Budget-step simulator/i)).toBeInTheDocument();
    const switchEl = screen.getByRole("switch", { name: "Include fees in ladder math" });
    expect(switchEl).toBeInTheDocument();
    expect(screen.getByText(/Rungs:/i)).toBeInTheDocument();
  });
});
