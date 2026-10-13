import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import UpdatePrices from "./UpdatePrices";
import * as storage from "@/lib/storage";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/use-refresh-prices", () => ({
  useRefreshPrices: () => ({
    refreshing: false,
    refreshAll: vi.fn().mockResolvedValue({ success: 1, failed: [] }),
    lastRefreshed: null,
  }),
  formatLastRefreshed: () => "just now",
}));

describe("UpdatePrices Page", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders empty state when there are no holdings", () => {
    vi.spyOn(storage, "getHoldings").mockReturnValue([]);
    render(<UpdatePrices />);

    expect(
      screen.getByText(/No holdings yet. Add a holding before updating prices./i)
    ).toBeInTheDocument();
  });

  it("renders price inputs with accessible labels and action controls when holdings exist", () => {
    const mockHoldings: storage.Holding[] = [
      {
        id: "h1",
        ticker: "AAPL",
        shares: 10,
        avg_cost: 150,
        exchange: "US",
      },
    ];
    vi.spyOn(storage, "getHoldings").mockReturnValue(mockHoldings);

    render(<UpdatePrices />);

    expect(screen.getByRole("button", { name: /Refresh Prices/i })).toBeInTheDocument();

    const priceInputs = screen.getAllByRole("spinbutton", {
      name: /Current price for AAPL/i,
    });
    expect(priceInputs.length).toBeGreaterThan(0);
  });

  it("displays sticky save bar with status landmark when prices are edited", () => {
    const mockHoldings: storage.Holding[] = [
      {
        id: "h1",
        ticker: "AAPL",
        shares: 10,
        avg_cost: 150,
        exchange: "US",
      },
    ];
    vi.spyOn(storage, "getHoldings").mockReturnValue(mockHoldings);

    render(<UpdatePrices />);

    const priceInput = screen.getAllByRole("spinbutton", {
      name: /Current price for AAPL/i,
    })[0];

    fireEvent.change(priceInput, { target: { value: "175.50" } });

    const statusRegion = screen.getByRole("status", { name: /Unsaved price changes/i });
    expect(statusRegion).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save prices/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reset/i })).toBeInTheDocument();
  });
});
