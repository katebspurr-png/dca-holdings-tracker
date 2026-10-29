import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UpdatePrices from "./UpdatePrices";

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockHoldings = [
  { id: "h1", ticker: "AAPL", exchange: "US", shares: 10, avg_cost: 150 },
  { id: "h2", ticker: "MSFT", exchange: "US", shares: 5, avg_cost: 300 },
];

let currentHoldings = [...mockHoldings];

vi.mock("@/lib/storage", () => ({
  STORAGE_CHANGE_EVENT: "dca-storage-change",
  getHoldings: vi.fn(() => currentHoldings),
  currencyPrefix: vi.fn(() => "$"),
  apiTicker: (ticker: string) => ticker,
}));

vi.mock("@/lib/stock-price", () => ({
  getCachedQuote: vi.fn((ticker: string) => {
    if (ticker === "AAPL") return { price: 175 };
    if (ticker === "MSFT") return { price: 320 };
    return null;
  }),
}));

const mockRefreshAll = vi.fn().mockResolvedValue({ total: 2, success: 2, failed: [] });

vi.mock("@/hooks/use-refresh-prices", () => ({
  useRefreshPrices: () => ({
    refreshing: false,
    refreshAll: mockRefreshAll,
    lastRefreshed: Date.now(),
  }),
  formatLastRefreshed: () => "just now",
}));

describe("UpdatePrices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentHoldings = [...mockHoldings];
  });

  it("renders empty state when there are no holdings", () => {
    currentHoldings = [];
    render(<UpdatePrices />);

    expect(
      screen.getByText("No holdings yet. Add a holding before updating prices.")
    ).toBeInTheDocument();
  });

  it("renders holdings and inputs with explicit aria-label attributes", () => {
    render(<UpdatePrices />);

    const aaplInputs = screen.getAllByRole("spinbutton", {
      name: "Market price for AAPL",
    });
    expect(aaplInputs.length).toBeGreaterThan(0);
    expect(aaplInputs[0]).toHaveValue(175);

    const msftInputs = screen.getAllByRole("spinbutton", {
      name: "Market price for MSFT",
    });
    expect(msftInputs.length).toBeGreaterThan(0);
    expect(msftInputs[0]).toHaveValue(320);
  });

  it("allows updating prices and saving changes", () => {
    render(<UpdatePrices />);

    const aaplInputs = screen.getAllByRole("spinbutton", {
      name: "Market price for AAPL",
    });
    fireEvent.change(aaplInputs[0], { target: { value: "180" } });

    expect(screen.getByText("1 price edited")).toBeInTheDocument();

    const saveButton = screen.getByRole("button", { name: /Save prices/i });
    fireEvent.click(saveButton);

    expect(mockToast).toHaveBeenCalledWith({ title: "Market prices updated" });
  });

  it("triggers price refresh on button click", async () => {
    render(<UpdatePrices />);

    const refreshButton = screen.getByRole("button", { name: /Refresh Prices/i });
    fireEvent.click(refreshButton);

    expect(mockRefreshAll).toHaveBeenCalled();
  });
});
