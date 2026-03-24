import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRefreshPrices } from "./use-refresh-prices";

const mockHoldings = [
  { id: "1", ticker: "AAPL", exchange: "US" as const, shares: 10, avg_cost: 150, initial_avg_cost: 150, fee: 0, fee_type: "flat" as const, fee_value: 0, created_at: "2024-01-01T00:00:00Z" },
  { id: "2", ticker: "SHOP", exchange: "TSX" as const, shares: 5, avg_cost: 80, initial_avg_cost: 80, fee: 0, fee_type: "flat" as const, fee_value: 0, created_at: "2024-01-01T00:00:00Z" },
];

vi.mock("@/lib/storage", () => ({
  getHoldings: vi.fn(() => [...mockHoldings]),
  apiTicker: (ticker: string, exchange: string) => (exchange === "TSX" ? `${ticker}.TO` : ticker),
}));

const mockFetchStockPrice = vi.fn();

vi.mock("@/lib/stock-price", () => ({
  fetchStockPrice: (symbol: string, opts?: { bypassCache?: boolean }) =>
    mockFetchStockPrice(symbol, opts),
}));

describe("useRefreshPrices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchStockPrice.mockResolvedValue({ ok: true, quote: { ticker: "X", price: 1 }, fromCache: false });
  });

  it("calls fetchStockPrice for each holding with correct API symbol", async () => {
    const { result } = renderHook(() => useRefreshPrices());

    await act(async () => {
      await result.current.refreshAll();
    });

    expect(mockFetchStockPrice).toHaveBeenCalledTimes(2);
    expect(mockFetchStockPrice).toHaveBeenCalledWith("AAPL", { bypassCache: true });
    expect(mockFetchStockPrice).toHaveBeenCalledWith("SHOP.TO", { bypassCache: true });
  });

  it("reports success and failed tickers correctly", async () => {
    mockFetchStockPrice
      .mockResolvedValueOnce({ ok: true, quote: { ticker: "AAPL", price: 175 }, fromCache: false })
      .mockResolvedValueOnce({ ok: false, error: "Price unavailable" });

    const { result } = renderHook(() => useRefreshPrices());

    let refreshResult: { total: number; success: number; failed: string[] } = { total: 0, success: 0, failed: [] };
    await act(async () => {
      refreshResult = await result.current.refreshAll();
    });

    expect(refreshResult.total).toBe(2);
    expect(refreshResult.success).toBe(1);
    expect(refreshResult.failed).toEqual(["SHOP"]);
  });

  it("reports all success when all fetches succeed", async () => {
    mockFetchStockPrice
      .mockResolvedValueOnce({ ok: true, quote: { ticker: "AAPL", price: 175 }, fromCache: false })
      .mockResolvedValueOnce({ ok: true, quote: { ticker: "SHOP.TO", price: 85 }, fromCache: false });

    const { result } = renderHook(() => useRefreshPrices());

    let refreshResult: { total: number; success: number; failed: string[] } = { total: 0, success: 0, failed: [] };
    await act(async () => {
      refreshResult = await result.current.refreshAll();
    });

    expect(refreshResult.total).toBe(2);
    expect(refreshResult.success).toBe(2);
    expect(refreshResult.failed).toEqual([]);
  });

  it("invokes onComplete callback after refresh", async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useRefreshPrices());

    await act(async () => {
      await result.current.refreshAll(onComplete);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
