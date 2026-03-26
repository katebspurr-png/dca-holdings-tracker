/**
 * Versioned localStorage persistence layer.
 * Replaces Supabase for local-first data storage.
 */

import { createInitialDemoAppData } from "./demoSampleData";

export type FeeType = "flat" | "percent";
export type Exchange = "US" | "TSX";

export type Holding = {
  id: string;
  ticker: string;
  exchange: Exchange;
  shares: number;
  avg_cost: number;
  initial_avg_cost: number;
  fee: number;
  fee_type: FeeType;
  fee_value: number;
  created_at: string;
  current_price?: number | null;
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

export type Transaction = {
  id: string;
  holding_id: string;
  ticker: string;
  transaction_type: string;
  buy_price: number;
  shares_bought: number;
  budget_invested: number;
  fee_applied: number;
  total_spend: number;
  include_fees: boolean;
  fee_type_snapshot: string;
  fee_value_snapshot: number;
  previous_shares: number;
  previous_avg_cost: number;
  new_total_shares: number;
  new_avg_cost: number;
  method: string;
  notes: string | null;
  is_undone: boolean;
  undone_at: string | null;
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

export type OptimizationScenario = {
  id: string;
  name: string;
  total_budget: number;
  include_fees: boolean;
  optimization_mode: string;
  selected_holdings_json: string;
  allocation_results_json: string;
  projected_portfolio_avg: number;
  total_fees: number;
  total_spend: number;
  created_at: string;
};

export interface AppData {
  version: 1;
  holdings: Holding[];
  scenarios: Scenario[];
  transactions?: Transaction[];
  whatIfComparisons?: WhatIfComparison[];
  optimizationScenarios?: OptimizationScenario[];
}

export const STORAGE_CHANGE_EVENT = "positionpilot-storage-change";
export const DEMO_MODE_SESSION_KEY = "positionpilot-demo-mode";

const BASE_KEY = "positionpilot-data";
const DEMO_DATA_PREFIX = "positionpilot-demo";

let STORAGE_KEY = BASE_KEY;
let CURRENT_USER_ID: string | null = null;

function emptyAppData(): AppData {
  return {
    version: 1,
    holdings: [],
    scenarios: [],
    transactions: [],
    whatIfComparisons: [],
    optimizationScenarios: [],
  };
}

export function notifyStorageChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
  }
}

/** Demo on/off flag — persisted in localStorage so refresh and new tabs stay in sync; clears on sign-out / exit demo. */
export function isDemoModeSessionActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(DEMO_MODE_SESSION_KEY) === "1") return true;
    const legacy = sessionStorage.getItem(DEMO_MODE_SESSION_KEY);
    if (legacy === "1") {
      localStorage.setItem(DEMO_MODE_SESSION_KEY, "1");
      sessionStorage.removeItem(DEMO_MODE_SESSION_KEY);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function setDemoModeSessionActive(active: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (active) {
      localStorage.setItem(DEMO_MODE_SESSION_KEY, "1");
      sessionStorage.removeItem(DEMO_MODE_SESSION_KEY);
    } else {
      localStorage.removeItem(DEMO_MODE_SESSION_KEY);
      sessionStorage.removeItem(DEMO_MODE_SESSION_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function clearDemoModeSessionFlag() {
  setDemoModeSessionActive(false);
}

/** Ensure demo localStorage bucket exists with the initial sample (call after enabling demo session flag). */
export function initializeDemoStorageIfNeeded() {
  if (!isDemoModeSessionActive()) return;
  const key = getDemoDataKey();
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(createInitialDemoAppData()));
  }
  notifyStorageChange();
}

/** Replace demo sandbox with the original sample dataset. */
export function resetDemoToInitialSample() {
  if (!isDemoModeSessionActive()) return;
  localStorage.setItem(getDemoDataKey(), JSON.stringify(createInitialDemoAppData()));
  notifyStorageChange();
}

function getDemoDataKey(): string {
  return `${DEMO_DATA_PREFIX}-${CURRENT_USER_ID ?? "guest"}`;
}

function getActiveDataKey(): string {
  return isDemoModeSessionActive() ? getDemoDataKey() : STORAGE_KEY;
}

function shouldSyncToCloud(): boolean {
  return Boolean(CURRENT_USER_ID) && !isDemoModeSessionActive();
}

/**
 * Called by AuthContext on login — scopes storage to the logged-in user.
 * Each user gets their own isolated data on this device.
 */
export function initStorageForUser(userId: string) {
  STORAGE_KEY = `${BASE_KEY}-${userId}`;
  CURRENT_USER_ID = userId;
}

/** Called on sign out — resets to the base key */
export function clearStorageUser() {
  STORAGE_KEY = BASE_KEY;
  CURRENT_USER_ID = null;
}

/** Returns the current user ID (used by sync layer) */
export function getCurrentUserId(): string | null {
  return CURRENT_USER_ID;
}

/**
 * Seeds localStorage with data pulled from Supabase.
 * Always writes the real user key (never the demo bucket).
 */
export function seedFromCloud(data: AppData) {
  const key = CURRENT_USER_ID ? `${BASE_KEY}-${CURRENT_USER_ID}` : BASE_KEY;
  localStorage.setItem(key, JSON.stringify(data));
  notifyStorageChange();
}

function migrateParsed(parsed: any): AppData | null {
  if (!parsed || parsed.version !== 1) return null;
  if (Array.isArray(parsed.holdings)) {
    parsed.holdings = parsed.holdings.map((h: any) => ({
      ...h,
      exchange: h.exchange ?? "US",
      initial_avg_cost: h.initial_avg_cost ?? h.avg_cost,
    }));
  }
  if (Array.isArray(parsed.transactions)) {
    parsed.transactions = parsed.transactions.map((t: any) => ({
      ...t,
      is_undone: t.is_undone ?? false,
      undone_at: t.undone_at ?? null,
    }));
  }
  return parsed as AppData;
}

function persistInitialDemoIfNeeded(key: string): AppData {
  const initial = createInitialDemoAppData();
  localStorage.setItem(key, JSON.stringify(initial));
  notifyStorageChange();
  return initial;
}

function readFromKey(key: string): AppData {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (isDemoModeSessionActive() && key === getDemoDataKey()) {
        return persistInitialDemoIfNeeded(key);
      }
      return emptyAppData();
    }
    const parsed = JSON.parse(raw);
    const migrated = migrateParsed(parsed);
    if (!migrated) {
      if (isDemoModeSessionActive() && key === getDemoDataKey()) {
        return persistInitialDemoIfNeeded(key);
      }
      return emptyAppData();
    }
    return migrated;
  } catch {
    if (isDemoModeSessionActive() && key === getDemoDataKey()) {
      return persistInitialDemoIfNeeded(key);
    }
    return emptyAppData();
  }
}

// ── Core read/write ──────────────────────────────────────────

function read(): AppData {
  return readFromKey(getActiveDataKey());
}

/**
 * Holdings for the real user bucket only (ignores demo session flag).
 * Used after exiting demo to validate routes against real data.
 */
export function getRealHoldings(): Holding[] {
  const data = readFromKey(STORAGE_KEY);
  return data.holdings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function write(data: AppData) {
  localStorage.setItem(getActiveDataKey(), JSON.stringify(data));
  notifyStorageChange();
}

function uid(): string {
  return crypto.randomUUID();
}

// Lazy import sync to avoid circular deps — fires and forgets
function sync() {
  return import("./sync");
}

// ── Currency helpers ─────────────────────────────────────────

export function currencyPrefix(exchange: Exchange): string {
  return exchange === "TSX" ? "C$" : "$";
}

export function exchangeLabel(exchange: Exchange): string {
  return exchange === "TSX" ? "TSX" : "US";
}

/** Yahoo / Finnhub symbol: TSX uses `.TO`; TSX Venture uses `.V` (the price API retries `.V` if `.TO` fails). */
export function apiTicker(ticker: string, exchange: Exchange): string {
  return exchange === "TSX" ? `${ticker}.TO` : ticker;
}

// ── Holdings CRUD ────────────────────────────────────────────

export function getHoldings(): Holding[] {
  return read().holdings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getHolding(id: string): Holding | undefined {
  return read().holdings.find((h) => h.id === id);
}

export function addHolding(h: Omit<Holding, "id" | "created_at" | "initial_avg_cost"> & { initial_avg_cost?: number }): Holding {
  const data = read();
  const holding: Holding = {
    ...h,
    initial_avg_cost: h.initial_avg_cost ?? h.avg_cost,
    id: uid(),
    created_at: new Date().toISOString(),
  };
  data.holdings.push(holding);
  write(data);
  const uid_ = CURRENT_USER_ID;
  if (uid_ && shouldSyncToCloud()) sync().then((s) => s.pushHolding(holding, uid_));
  return holding;
}

export function editHolding(id: string, patch: Partial<Omit<Holding, "id" | "created_at">>): Holding {
  const data = read();
  const idx = data.holdings.findIndex((h) => h.id === id);
  if (idx === -1) throw new Error("Holding not found");
  data.holdings[idx] = { ...data.holdings[idx], ...patch };
  write(data);
  const uid_ = CURRENT_USER_ID;
  if (uid_ && shouldSyncToCloud()) sync().then((s) => s.pushHolding(data.holdings[idx], uid_));
  return data.holdings[idx];
}

export function removeHolding(id: string) {
  const data = read();
  data.holdings = data.holdings.filter((h) => h.id !== id);
  data.scenarios = data.scenarios.filter((s) => s.holding_id !== id);
  write(data);
  if (shouldSyncToCloud()) sync().then((s) => s.deleteHolding(id));
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
  if (shouldSyncToCloud()) sync().then((m) => m.pushScenario(scenario));
  return scenario;
}

export function removeScenario(id: string) {
  const data = read();
  data.scenarios = data.scenarios.filter((s) => s.id !== id);
  write(data);
  if (shouldSyncToCloud()) sync().then((s) => s.deleteScenario(id));
}

// ── Reset ────────────────────────────────────────────────────

export function resetAll() {
  if (isDemoModeSessionActive()) {
    localStorage.setItem(getDemoDataKey(), JSON.stringify(createInitialDemoAppData()));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  notifyStorageChange();
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
  const uid_ = CURRENT_USER_ID;
  if (uid_ && shouldSyncToCloud()) sync().then((s) => s.pushWhatIfComparison(comp, uid_));
  return comp;
}

export function removeWhatIfComparison(id: string) {
  const data = read();
  data.whatIfComparisons = (data.whatIfComparisons ?? []).filter((c) => c.id !== id);
  write(data);
  if (shouldSyncToCloud()) sync().then((s) => s.deleteWhatIfComparison(id));
}

// ── Transactions ─────────────────────────────────────────────

export function getTransactionsForHolding(holdingId: string): Transaction[] {
  return (read().transactions ?? [])
    .filter((t) => t.holding_id === holdingId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function addTransaction(t: Omit<Transaction, "id" | "created_at">): Transaction {
  const data = read();
  const tx: Transaction = { ...t, id: uid(), created_at: new Date().toISOString() };
  if (!data.transactions) data.transactions = [];
  data.transactions.push(tx);
  write(data);
  return tx;
}

/**
 * Apply a DCA buy: create transaction record + update holding in one atomic write.
 * Throws if holding not found or values invalid.
 */
export function applyBuyToHolding(params: {
  holdingId: string;
  buyPrice: number;
  sharesBought: number;
  budgetInvested: number;
  feeApplied: number;
  totalSpend: number;
  includeFees: boolean;
  newTotalShares: number;
  newAvgCost: number;
  method: string;
  notes?: string | null;
}): Transaction {
  const data = read();
  const idx = data.holdings.findIndex((h) => h.id === params.holdingId);
  if (idx === -1) throw new Error("Holding not found");

  const h = data.holdings[idx];

  if (params.sharesBought <= 0 || params.budgetInvested <= 0) {
    throw new Error("Shares and budget must be positive");
  }

  const tx: Transaction = {
    id: uid(),
    holding_id: h.id,
    ticker: h.ticker,
    transaction_type: "buy",
    buy_price: params.buyPrice,
    shares_bought: params.sharesBought,
    budget_invested: params.budgetInvested,
    fee_applied: params.feeApplied,
    total_spend: params.totalSpend,
    include_fees: params.includeFees,
    fee_type_snapshot: h.fee_type,
    fee_value_snapshot: h.fee_value,
    previous_shares: h.shares,
    previous_avg_cost: h.avg_cost,
    new_total_shares: params.newTotalShares,
    new_avg_cost: params.newAvgCost,
    method: params.method,
    notes: params.notes ?? null,
    is_undone: false,
    undone_at: null,
    created_at: new Date().toISOString(),
  };

  data.holdings[idx] = { ...h, shares: params.newTotalShares, avg_cost: params.newAvgCost };

  if (!data.transactions) data.transactions = [];
  data.transactions.push(tx);

  write(data);

  const uid_ = CURRENT_USER_ID;
  if (uid_ && shouldSyncToCloud()) {
    sync().then((s) => {
      s.pushHolding(data.holdings[idx], uid_);
      s.pushTransaction(tx);
    });
  }

  return tx;
}

/**
 * Undo the most recent applied buy for a holding.
 * Restores previous shares/avg_cost and marks the transaction as undone.
 */
export function undoLastBuy(holdingId: string): void {
  const data = read();
  const txs = (data.transactions ?? [])
    .filter((t) => t.holding_id === holdingId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const latest = txs[0];
  if (!latest) throw new Error("No transactions found");
  if (latest.transaction_type !== "buy") throw new Error("Latest transaction is not a buy");
  if (latest.is_undone) throw new Error("Latest transaction is already undone");

  const hIdx = data.holdings.findIndex((h) => h.id === holdingId);
  if (hIdx === -1) throw new Error("Holding not found");
  data.holdings[hIdx] = {
    ...data.holdings[hIdx],
    shares: latest.previous_shares,
    avg_cost: latest.previous_avg_cost,
  };

  const tIdx = (data.transactions ?? []).findIndex((t) => t.id === latest.id);
  if (tIdx === -1) throw new Error("Transaction not found");
  const updatedTx = {
    ...data.transactions![tIdx],
    is_undone: true,
    undone_at: new Date().toISOString(),
  };
  data.transactions![tIdx] = updatedTx;

  write(data);

  const uid_ = CURRENT_USER_ID;
  if (uid_ && shouldSyncToCloud()) {
    sync().then((s) => {
      s.pushHolding(data.holdings[hIdx], uid_);
      s.patchTransaction(updatedTx.id, { is_undone: true, undone_at: updatedTx.undone_at });
    });
  }
}

// ── Optimization Scenarios ──────────────────────────────────

export function getOptimizationScenarios(): OptimizationScenario[] {
  return (read().optimizationScenarios ?? []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function addOptimizationScenario(s: Omit<OptimizationScenario, "id" | "created_at">): OptimizationScenario {
  const data = read();
  const opt: OptimizationScenario = { ...s, id: uid(), created_at: new Date().toISOString() };
  if (!data.optimizationScenarios) data.optimizationScenarios = [];
  data.optimizationScenarios.push(opt);
  write(data);
  const uid_ = CURRENT_USER_ID;
  if (uid_ && shouldSyncToCloud()) sync().then((m) => m.pushOptimizationScenario(opt, uid_));
  return opt;
}

export function removeOptimizationScenario(id: string) {
  const data = read();
  data.optimizationScenarios = (data.optimizationScenarios ?? []).filter((s) => s.id !== id);
  write(data);
  if (shouldSyncToCloud()) sync().then((s) => s.deleteOptimizationScenario(id));
}
