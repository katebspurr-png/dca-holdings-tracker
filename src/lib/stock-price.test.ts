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
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it("ignores cache and calls fetch when bypassCache is true", async () => {
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
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fromCache).toBe(false);
      expect(r.quote.price).toBe(200);
      expect(r.quote.ticker).toBe("AAPL");
    }
  });

  it("uses Supabase edge when configured and skips Yahoo", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-anon-key");

    const edgeBody = {
      ticker: "AAPL",
      price: 222,
      previousClose: 220,
      change: 2,
      changePercent: 0.9,
      week52High: null,
      week52Low: null,
      todayOpen: null,
      todayHigh: null,
      todayLow: null,
      todayVolume: null,
      avgVolume: null,
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("supabase.co/functions/v1/stock-price")) {
        return Promise.resolve(
          new Response(JSON.stringify(edgeBody), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      return Promise.reject(new Error("Yahoo should not be called"));
    });

    const r = await fetchStockPrice("AAPL", { bypassCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.quote.price).toBe(222);
      expect(r.quote.ticker).toBe("AAPL");
    }
  });
});
