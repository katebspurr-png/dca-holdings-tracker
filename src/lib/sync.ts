/**
 * Supabase sync layer.
 *
 * Strategy: write-through cache.
 *   - localStorage is the source of truth for reads (fast, sync)
 *   - Every write fires a background Supabase upsert/delete
 *   - On login, syncFromCloud() pulls all user data into localStorage
 *
 * Components never change — they still call the sync storage functions.
 */

import { supabase } from "@/integrations/supabase/client";

// Cast for tables not yet in the generated types but present in the DB
const db = supabase as any;
import type {
  Holding,
  Scenario,
  Transaction,
  WhatIfComparison,
  OptimizationScenario,
  AppData,
} from "./storage";

// ── Helpers ──────────────────────────────────────────────────

function log(msg: string, err?: unknown) {
  if (err) console.error(`[sync] ${msg}`, err);
}

/** Map a Supabase `transactions` row to local `Transaction` shape. */
export function transactionFromDbRow(t: Record<string, unknown>): Transaction {
  return {
    id: String(t.id),
    holding_id: String(t.holding_id),
    ticker: String(t.ticker),
    transaction_type: String(t.transaction_type ?? "buy"),
    buy_price: Number(t.buy_price),
    shares_bought: Number(t.shares_bought),
    budget_invested: Number(t.budget_invested),
    fee_applied: Number(t.fee_applied ?? 0),
    total_spend: Number(t.total_spend),
    include_fees: Boolean(t.include_fees),
    fee_type_snapshot: String(t.fee_type_snapshot ?? "flat"),
    fee_value_snapshot: Number(t.fee_value_snapshot ?? 0),
    previous_shares: Number(t.previous_shares),
    previous_avg_cost: Number(t.previous_avg_cost),
    new_total_shares: Number(t.new_total_shares),
    new_avg_cost: Number(t.new_avg_cost),
    method: String(t.method),
    notes: t.notes != null ? String(t.notes) : null,
    is_undone: Boolean(t.is_undone),
    undone_at: t.undone_at != null ? String(t.undone_at) : null,
    created_at: String(t.created_at),
  };
}

// ── Pull: Supabase → localStorage ───────────────────────────

/**
 * Called once on login.
 * Fetches all user data from Supabase and returns it as AppData
 * so AuthContext can seed localStorage.
 */
export async function pullFromCloud(userId: string): Promise<AppData | null> {
  try {
    const [holdingsRes, scenariosRes, transactionsRes, whatIfRes, optimizationRes] =
      await Promise.all([
        supabase
          .from("holdings")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true }),
        supabase
          .from("dca_scenarios")
          .select("*, holdings!inner(user_id)")
          .eq("holdings.user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("transactions")
          .select("*, holdings!inner(user_id)")
          .eq("holdings.user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("what_if_comparisons")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("optimization_scenarios")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);

    if (holdingsRes.error) throw holdingsRes.error;

    const holdings: Holding[] = (holdingsRes.data ?? []).map((h: any) => ({
      id: h.id,
      ticker: h.ticker,
      exchange: h.exchange ?? "US",
      shares: Number(h.shares),
      avg_cost: Number(h.avg_cost),
      initial_avg_cost: Number(h.initial_avg_cost ?? h.avg_cost),
      fee: Number(h.fee ?? 0),
      fee_type: h.fee_type ?? "flat",
      fee_value: Number(h.fee_value ?? 0),
      created_at: h.created_at,
    }));

    const scenarios: Scenario[] = (scenariosRes.data ?? []).map((s: any) => ({
      id: s.id,
      holding_id: s.holding_id,
      ticker: s.ticker,
      method: s.method,
      input1_label: s.input1_label,
      input1_value: Number(s.input1_value),
      input2_label: s.input2_label,
      input2_value: Number(s.input2_value),
      include_fees: s.include_fees,
      fee_amount: Number(s.fee_amount),
      buy_price: s.buy_price != null ? Number(s.buy_price) : null,
      shares_to_buy: Number(s.shares_to_buy),
      budget_invested: Number(s.budget_invested),
      fee_applied: Number(s.fee_applied),
      total_spend: Number(s.total_spend),
      new_total_shares: Number(s.new_total_shares),
      new_avg_cost: Number(s.new_avg_cost),
      recommended_target: s.recommended_target != null ? Number(s.recommended_target) : null,
      budget_percent_used: s.budget_percent_used != null ? Number(s.budget_percent_used) : null,
      notes: s.notes ?? null,
      created_at: s.created_at,
    }));

    const transactions: Transaction[] = (transactionsRes.data ?? []).map((t: Record<string, unknown>) =>
      transactionFromDbRow(t)
    );

    const whatIfComparisons: WhatIfComparison[] = (whatIfRes.data ?? []).map((w: any) => ({
      id: w.id,
      totalBudget: Number(w.total_budget),
      scenarios: w.scenarios ?? [],
      created_at: w.created_at,
    }));

    const optimizationScenarios: OptimizationScenario[] = (optimizationRes.data ?? []).map(
      (o: any) => ({
        id: o.id,
        name: o.name,
        total_budget: Number(o.total_budget),
        include_fees: o.include_fees,
        optimization_mode: o.optimization_mode,
        selected_holdings_json: o.selected_holdings_json,
        allocation_results_json: o.allocation_results_json,
        projected_portfolio_avg: Number(o.projected_portfolio_avg),
        total_fees: Number(o.total_fees),
        total_spend: Number(o.total_spend),
        created_at: o.created_at,
      })
    );

    return {
      version: 1,
      holdings,
      scenarios,
      transactions,
      whatIfComparisons,
      optimizationScenarios,
    };
  } catch (err) {
    log("pullFromCloud failed", err);
    return null;
  }
}

// ── Push: Holdings ───────────────────────────────────────────

export async function pushHolding(holding: Holding, userId: string) {
  const { error } = await supabase.from("holdings").upsert({
    id: holding.id,
    user_id: userId,
    ticker: holding.ticker,
    exchange: holding.exchange,
    shares: holding.shares,
    avg_cost: holding.avg_cost,
    initial_avg_cost: holding.initial_avg_cost,
    fee: holding.fee,
    fee_type: holding.fee_type,
    fee_value: holding.fee_value,
    created_at: holding.created_at,
  });
  if (error) log("pushHolding failed", error);
}

export async function deleteHolding(holdingId: string) {
  const { error } = await supabase.from("holdings").delete().eq("id", holdingId);
  if (error) log("deleteHolding failed", error);
}

export async function patchHolding(holdingId: string, patch: Partial<Holding>) {
  const { error } = await supabase.from("holdings").update(patch).eq("id", holdingId);
  if (error) log("patchHolding failed", error);
}

// ── Push: Scenarios ──────────────────────────────────────────

export async function pushScenario(scenario: Scenario) {
  const { error } = await supabase.from("dca_scenarios").upsert({
    id: scenario.id,
    holding_id: scenario.holding_id,
    ticker: scenario.ticker,
    method: scenario.method,
    input1_label: scenario.input1_label,
    input1_value: scenario.input1_value,
    input2_label: scenario.input2_label,
    input2_value: scenario.input2_value,
    include_fees: scenario.include_fees,
    fee_amount: scenario.fee_amount,
    buy_price: scenario.buy_price,
    shares_to_buy: scenario.shares_to_buy,
    budget_invested: scenario.budget_invested,
    fee_applied: scenario.fee_applied,
    total_spend: scenario.total_spend,
    new_total_shares: scenario.new_total_shares,
    new_avg_cost: scenario.new_avg_cost,
    recommended_target: scenario.recommended_target,
    budget_percent_used: scenario.budget_percent_used,
    notes: scenario.notes,
    created_at: scenario.created_at,
  });
  if (error) log("pushScenario failed", error);
}

export async function deleteScenario(scenarioId: string) {
  const { error } = await supabase.from("dca_scenarios").delete().eq("id", scenarioId);
  if (error) log("deleteScenario failed", error);
}

// ── Push: Transactions ───────────────────────────────────────

export async function pushTransaction(tx: Transaction) {
  const { error } = await supabase.from("transactions").upsert({
    id: tx.id,
    holding_id: tx.holding_id,
    ticker: tx.ticker,
    transaction_type: tx.transaction_type,
    buy_price: tx.buy_price,
    shares_bought: tx.shares_bought,
    budget_invested: tx.budget_invested,
    fee_applied: tx.fee_applied,
    total_spend: tx.total_spend,
    include_fees: tx.include_fees,
    fee_type_snapshot: tx.fee_type_snapshot,
    fee_value_snapshot: tx.fee_value_snapshot,
    previous_shares: tx.previous_shares,
    previous_avg_cost: tx.previous_avg_cost,
    new_total_shares: tx.new_total_shares,
    new_avg_cost: tx.new_avg_cost,
    method: tx.method,
    notes: tx.notes,
    is_undone: tx.is_undone,
    undone_at: tx.undone_at,
    created_at: tx.created_at,
  });
  if (error) log("pushTransaction failed", error);
}

export async function patchTransaction(txId: string, patch: Partial<Transaction>) {
  const { error } = await supabase.from("transactions").update(patch).eq("id", txId);
  if (error) log("patchTransaction failed", error);
}

// ── Push: What-If Comparisons ────────────────────────────────

export async function pushWhatIfComparison(comp: WhatIfComparison, userId: string) {
  const { error } = await supabase.from("what_if_comparisons").upsert({
    id: comp.id,
    user_id: userId,
    total_budget: comp.totalBudget,
    scenarios: comp.scenarios as any,
    created_at: comp.created_at,
  });
  if (error) log("pushWhatIfComparison failed", error);
}

export async function deleteWhatIfComparison(id: string) {
  const { error } = await supabase.from("what_if_comparisons").delete().eq("id", id);
  if (error) log("deleteWhatIfComparison failed", error);
}

// ── Push: Optimization Scenarios ─────────────────────────────

export async function pushOptimizationScenario(opt: OptimizationScenario, userId: string) {
  const { error } = await supabase.from("optimization_scenarios").upsert({
    id: opt.id,
    user_id: userId,
    name: opt.name,
    total_budget: opt.total_budget,
    include_fees: opt.include_fees,
    optimization_mode: opt.optimization_mode,
    selected_holdings_json: opt.selected_holdings_json,
    allocation_results_json: opt.allocation_results_json,
    projected_portfolio_avg: opt.projected_portfolio_avg,
    total_fees: opt.total_fees,
    total_spend: opt.total_spend,
    created_at: opt.created_at,
  });
  if (error) log("pushOptimizationScenario failed", error);
}

export async function deleteOptimizationScenario(id: string) {
  const { error } = await supabase.from("optimization_scenarios").delete().eq("id", id);
  if (error) log("deleteOptimizationScenario failed", error);
}
