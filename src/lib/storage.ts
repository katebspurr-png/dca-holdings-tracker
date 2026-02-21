/**
 * Versioned localStorage persistence layer.
 * Replaces Supabase for local-first data storage.
 */

export type FeeType = "flat" | "percent";
export type Exchange = "US" | "TSX";

export type Holding = {
  id: string;
  ticker: string;
  exchange: Exchange;
  shares: number;
  avg_cost: number;
  fee: number;
  fee_type: FeeType;
  fee_value: number;
  created_at: string;
};

export type Scenario = {
  id: string;
  holding_id: string;
  ticker: string;
  method: string;
  input1_label: string;
  input1_value: number;
  input2_label: string;
  input2_value: number;
  include_fees: boolean;
  fee_amount: number;
  buy_price: number | null;
  shares_to_buy: number;
  budget_invested: number;
  fee_applied: number;
  total_spend: number;
  new_total_shares: number;
  new_avg_cost: number;
  recommended_target: number | null;
  budget_percent_used: number | null;
  notes: string | null;
  created_at: string;
};

export type WhatIfAllocation = {
  holdingId: string;
  ticker: string;
  exchange: Exchange;
  currentShares: number;
  currentAvg: number;
  buyPrice: number | null;
  allocated: number; // dollar amount
};

export type WhatIfScenarioTab = {
  name: string;
  allocations: WhatIfAllocation[];
};

export type WhatIfComparison = {
  id: string;
  totalBudget: number;
  scenarios: WhatIfScenarioTab[];
  created_at: string;
};

export interface AppData {
  version: 1;
  holdings: Holding[];
  scenarios: Scenario[];
  whatIfComparisons?: WhatIfComparison[];
}

const STORAGE_KEY = "dca-down-data";

// ── Demo data ────────────────────────────────────────────────
const DEMO_HOLDINGS: Holding[] = [
  { id: "demo-aapl", ticker: "AAPL", exchange: "US", shares: 75, avg_cost: 198.5, fee: 0, fee_type: "flat", fee_value: 0, created_at: new Date().toISOString() },
  { id: "demo-nvda", ticker: "NVDA", exchange: "US", shares: 30, avg_cost: 142.8, fee: 0, fee_type: "flat", fee_value: 0, created_at: new Date().toISOString() },
  { id: "demo-shop", ticker: "SHOP", exchange: "TSX", shares: 15, avg_cost: 132.5, fee: 0, fee_type: "flat", fee_value: 0, created_at: new Date().toISOString() },
];

const DEMO_SCENARIOS: Scenario[] = [
  {
    id: "demo-calc-1", holding_id: "demo-nvda", ticker: "NVDA", method: "price_target",
    input1_label: "Buy price", input1_value: 112.5, input2_label: "Target average cost", input2_value: 125,
    include_fees: false, fee_amount: 0, buy_price: 112.5, shares_to_buy: 43,
    budget_invested: 4837.5, fee_applied: 0, total_spend: 4837.5,
    new_total_shares: 73, new_avg_cost: 125, recommended_target: null,
    budget_percent_used: null, notes: null, created_at: new Date().toISOString(),
  },
  {
    id: "demo-calc-2", holding_id: "demo-shop", ticker: "SHOP", method: "price_budget",
    input1_label: "Buy price", input1_value: 115, input2_label: "Max budget", input2_value: 1000,
    include_fees: false, fee_amount: 0, buy_price: 115, shares_to_buy: 8.7,
    budget_invested: 1000, fee_applied: 0, total_spend: 1000,
    new_total_shares: 23.7, new_avg_cost: 125.38, recommended_target: 125.38,
    budget_percent_used: 100, notes: null, created_at: new Date().toISOString(),
  },
  {
    id: "demo-calc-3", holding_id: "demo-aapl", ticker: "AAPL", method: "price_target",
    input1_label: "Buy price", input1_value: 172, input2_label: "Target average cost", input2_value: 185,
    include_fees: false, fee_amount: 0, buy_price: 172, shares_to_buy: 78,
    budget_invested: 13416, fee_applied: 0, total_spend: 13416,
    new_total_shares: 153, new_avg_cost: 185, recommended_target: null,
    budget_percent_used: null, notes: null, created_at: new Date().toISOString(),
  },
];

function demoData(): AppData {
  return { version: 1, holdings: [...DEMO_HOLDINGS], scenarios: [...DEMO_SCENARIOS] };
}

// ── Core read/write ──────────────────────────────────────────

function read(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return demoData();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return demoData();
    // Migrate: add exchange field if missing
    if (Array.isArray(parsed.holdings)) {
      parsed.holdings = parsed.holdings.map((h: any) => ({
        ...h,
        exchange: h.exchange ?? "US",
      }));
    }
    return parsed as AppData;
  } catch {
    return demoData();
  }
}

// ── Currency helpers ─────────────────────────────────────────

export function currencyPrefix(exchange: Exchange): string {
  return exchange === "TSX" ? "C$" : "$";
}

export function exchangeLabel(exchange: Exchange): string {
  return exchange === "TSX" ? "TSX" : "US";
}

/** The ticker symbol used for API lookups (appends .TO for TSX) */
export function apiTicker(ticker: string, exchange: Exchange): string {
  return exchange === "TSX" ? `${ticker}.TO` : ticker;
}

function write(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function uid(): string {
  return crypto.randomUUID();
}

// ── Holdings CRUD ────────────────────────────────────────────

export function getHoldings(): Holding[] {
  return read().holdings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getHolding(id: string): Holding | undefined {
  return read().holdings.find((h) => h.id === id);
}

export function addHolding(h: Omit<Holding, "id" | "created_at">): Holding {
  const data = read();
  const holding: Holding = { ...h, id: uid(), created_at: new Date().toISOString() };
  data.holdings.push(holding);
  write(data);
  return holding;
}

export function editHolding(id: string, patch: Partial<Omit<Holding, "id" | "created_at">>): Holding {
  const data = read();
  const idx = data.holdings.findIndex((h) => h.id === id);
  if (idx === -1) throw new Error("Holding not found");
  data.holdings[idx] = { ...data.holdings[idx], ...patch };
  write(data);
  return data.holdings[idx];
}

export function removeHolding(id: string) {
  const data = read();
  data.holdings = data.holdings.filter((h) => h.id !== id);
  data.scenarios = data.scenarios.filter((s) => s.holding_id !== id);
  write(data);
}

// ── Scenarios CRUD ───────────────────────────────────────────

export function getScenarios(): Scenario[] {
  return read().scenarios.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getScenariosForHolding(holdingId: string): Scenario[] {
  return getScenarios().filter((s) => s.holding_id === holdingId);
}

export function getRecommendedTargets(holdingId: string): Scenario[] {
  return getScenariosForHolding(holdingId).filter((s) => s.recommended_target != null);
}

export function getScenario(id: string): Scenario | undefined {
  return read().scenarios.find((s) => s.id === id);
}

export function addScenario(s: Omit<Scenario, "id" | "created_at">): Scenario {
  const data = read();
  const scenario: Scenario = { ...s, id: uid(), created_at: new Date().toISOString() };
  data.scenarios.push(scenario);
  write(data);
  return scenario;
}

// ── Reset ────────────────────────────────────────────────────

export function resetAll() {
  localStorage.removeItem(STORAGE_KEY);
  // Next read() will return demo data
}

// ── Export / Import ──────────────────────────────────────────

export function exportData(): string {
  return JSON.stringify(read(), null, 2);
}

export function importData(json: string) {
  const parsed = JSON.parse(json);
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.holdings) || !Array.isArray(parsed.scenarios)) {
    throw new Error("Invalid backup file");
  }
  write(parsed as AppData);
}

// ── What-If Comparisons ─────────────────────────────────────

export function getWhatIfComparisons(): WhatIfComparison[] {
  return (read().whatIfComparisons ?? []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function addWhatIfComparison(c: Omit<WhatIfComparison, "id" | "created_at">): WhatIfComparison {
  const data = read();
  const comp: WhatIfComparison = { ...c, id: uid(), created_at: new Date().toISOString() };
  if (!data.whatIfComparisons) data.whatIfComparisons = [];
  data.whatIfComparisons.push(comp);
  write(data);
  return comp;
}

export function removeWhatIfComparison(id: string) {
  const data = read();
  data.whatIfComparisons = (data.whatIfComparisons ?? []).filter((c) => c.id !== id);
  write(data);
}

/** Apply scenario trades to holdings: add shares and recalculate avg cost */
export function applyScenarioToHoldings(
  trades: { holdingId: string; sharesBought: number; buyPrice: number }[]
) {
  const data = read();
  for (const trade of trades) {
    const idx = data.holdings.findIndex((h) => h.id === trade.holdingId);
    if (idx === -1) continue;
    const h = data.holdings[idx];
    const newTotalShares = h.shares + trade.sharesBought;
    const newAvg =
      (h.shares * h.avg_cost + trade.sharesBought * trade.buyPrice) / newTotalShares;
    data.holdings[idx] = { ...h, shares: newTotalShares, avg_cost: newAvg };
  }
  write(data);
}
