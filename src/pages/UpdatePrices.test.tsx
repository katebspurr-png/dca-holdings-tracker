import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UpdatePrices from "./UpdatePrices";

const mockHoldings = [
  {
    id: "h1",
    ticker: "AAPL",
    shares: 10,
    avg_cost: 150,
    initial_avg_cost: 150,
    exchange: "US",
    fee: 0,
    fee_type: "flat",
    fee_value: 0,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "h2",
    ticker: "NVDA",
    shares: 5,
    avg_cost: 120,
    initial_avg_cost: 120,
    exchange: "US",
    fee: 0,
    fee_type: "flat",
    fee_value: 0,
    created_at: "2024-01-01T00:00:00Z",
  },
];

vi.mock("@/hooks/use-storage-revision", () => ({
  useStorageRevision: () => 1,
}));

vi.mock("@/lib/storage", () => ({
  getHoldings: vi.fn(() => [...mockHoldings]),
  currencyPrefix: (ex: string) => (ex === "TSX" ? "CA$" : "$"),
  apiTicker: (ticker: string) => ticker,
}));

vi.mock("@/lib/stock-price", () => ({
  getCachedQuote: vi.fn(() => null),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/use-refresh-prices", () => ({
  useRefreshPrices: () => ({
    refreshing: false,
    refreshAll: vi.fn(),
    lastRefreshed: null,
  }),
  formatLastRefreshed: () => "",
}));

describe("UpdatePrices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders accessible names for price inputs corresponding to holdings", () => {
    render(<UpdatePrices />);

    const aaplInputs = screen.getAllByRole("spinbutton", { name: "Market price for AAPL" });
    expect(aaplInputs.length).toBeGreaterThan(0);

    const nvdaInputs = screen.getAllByRole("spinbutton", { name: "Market price for NVDA" });
    expect(nvdaInputs.length).toBeGreaterThan(0);
  });

  it("renders refresh button with explicit aria-label", () => {
    render(<UpdatePrices />);

    const refreshBtn = screen.getByRole("button", { name: "Refresh market prices" });
    expect(refreshBtn).toBeInTheDocument();
  });

  it("displays save and reset buttons with aria-labels when prices are edited", () => {
    render(<UpdatePrices />);

    const aaplInput = screen.getAllByRole("spinbutton", { name: "Market price for AAPL" })[0];
    fireEvent.change(aaplInput, { target: { value: "185.50" } });

    const resetBtn = screen.getByRole("button", { name: "Reset price changes" });
    expect(resetBtn).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: "Save market prices" });
    expect(saveBtn).toBeInTheDocument();
  });
});
