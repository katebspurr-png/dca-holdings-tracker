import { useState, useCallback } from "react";
import { getHoldings, apiTicker } from "@/lib/storage";
import { fetchStockPrice } from "@/lib/stock-price";

const LAST_REFRESH_KEY = "dca-last-price-refresh";

export interface RefreshResult {
  total: number;
  success: number;
  failed: string[]; // ticker names that failed
}

export function getLastRefreshedAt(): number | null {
  try {
    const val = localStorage.getItem(LAST_REFRESH_KEY);
    return val ? Number(val) : null;
  } catch {
    return null;
  }
}

function setLastRefreshedAt() {
  localStorage.setItem(LAST_REFRESH_KEY, String(Date.now()));
}

export function formatLastRefreshed(ts: number | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function useRefreshPrices() {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(getLastRefreshedAt);

  const refreshAll = useCallback(async (onComplete?: () => void): Promise<RefreshResult> => {
    setRefreshing(true);
    const holdings = getHoldings();
    const symbols = holdings.map((h) => ({
      ticker: h.ticker,
      symbol: apiTicker(h.ticker, (h.exchange ?? "US") as any),
    }));

    const results = await Promise.allSettled(
      symbols.map((s) => fetchStockPrice(s.symbol))
    );

    let success = 0;
    const failed: string[] = [];

    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value.ok) {
        success++;
      } else {
        failed.push(symbols[i].ticker);
      }
    });

    setLastRefreshedAt();
    setLastRefreshed(Date.now());
    setRefreshing(false);
    onComplete?.();

    return { total: symbols.length, success, failed };
  }, []);

  return { refreshing, refreshAll, lastRefreshed };
}
