import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import GoalLadder from "./GoalLadder";
import { SimFeesProvider } from "@/contexts/SimFeesContext";
import { type Holding } from "@/lib/storage";
import * as stockPrice from "@/lib/stock-price";

vi.mock("@/lib/stock-price", () => ({
  getCachedQuote: vi.fn(),
}));

const mockHolding: Holding = {
  id: "h1",
  ticker: "AAPL",
  exchange: "US",
  shares: 10,
  avg_cost: 150,
  initial_avg_cost: 150,
  fee: 0,
  fee_type: "flat",
  fee_value: 0,
  created_at: "2024-01-01T00:00:00Z",
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <SimFeesProvider>{ui}</SimFeesProvider>
    </BrowserRouter>
  );
};

describe("GoalLadder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders price setup message when no quote price is cached", () => {
    vi.mocked(stockPrice.getCachedQuote).mockReturnValue(null);

    renderWithProviders(<GoalLadder holding={mockHolding} />);

    expect(screen.getByText(/Budget-step simulator/i)).toBeInTheDocument();
    expect(screen.getByText(/Add a current market price/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Update Prices/i })).toBeInTheDocument();
  });

  it("renders non-underwater banner when current price is at or above average cost", () => {
    vi.mocked(stockPrice.getCachedQuote).mockReturnValue({
      ticker: "AAPL",
      price: 160, // >= 150
      fetchedAt: Date.now(),
    });

    renderWithProviders(<GoalLadder holding={mockHolding} />);

    expect(screen.getByText(/Current price is at or above your average/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Include fees in ladder math/i)).toBeInTheDocument();
  });

  it("renders budget ladder rungs when position is underwater", () => {
    vi.mocked(stockPrice.getCachedQuote).mockReturnValue({
      ticker: "AAPL",
      price: 100, // < 150
      fetchedAt: Date.now(),
    });

    renderWithProviders(<GoalLadder holding={mockHolding} />);

    expect(screen.getByText(/Simulated buys at \$100.00\/share/i)).toBeInTheDocument();
    expect(screen.getByText(/Illustrative rung/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Include fees in ladder math/i)).toBeInTheDocument();
  });
});
