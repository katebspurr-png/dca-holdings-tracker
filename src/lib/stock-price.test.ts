import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./pro", () => ({
  canLookup: () => true,
  recordLookup: vi.fn(),
}));

import { fetchStockPrice } from "./stock-price";

const CACHE_KEY = "dca-price-cache";

function seedCache(ticker: string, price: number) {
  const upper = ticker.toUpperCase();
  const entry = {
    ticker: upper,
    price,
    previousClose: price,
    change: 0,
    changePercent: 0,
    fetchedAt: Date.now(),
    week52High: null,
    week52Low: null,
    todayOpen: null,
    todayHigh: null,
    todayLow: null,
    todayVolume: null,
    avgVolume: null,
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify({ [upper]: entry }));
}

describe("fetchStockPrice", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns cached quote without calling fetch when bypassCache is false", async () => {
    seedCache("AAPL", 100);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));

    const r = await fetchStockPrice("AAPL");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fromCache).toBe(true);
      expect(r.quote.price).toBe(100);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ignores cache and calls Yahoo chart API when bypassCache is true", async () => {
    seedCache("AAPL", 100);
    const body = {
      chart: {
        result: [
          {
            meta: {
              symbol: "AAPL",
              regularMarketPrice: 200,
              regularMarketPreviousClose: 199,
            },
            indicators: { quote: [{ close: [200] }] },
          },
        ],
      },
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const r = await fetchStockPrice("AAPL", { bypassCache: true });
    expect(fetchSpy).toHaveBeenCalled();
    const url = String(fetchSpy.mock.calls[0]?.[0] ?? "");
    expect(url).toContain("query1.finance.yahoo.com");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fromCache).toBe(false);
      expect(r.quote.price).toBe(200);
      expect(r.quote.ticker).toBe("AAPL");
    }
  });
});
