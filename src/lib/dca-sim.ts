/**
 * Shared DCA / average-cost simulation for ladder, portfolio highlights, insights, and capital optimizer.
 * Single source of truth for step amounts and selection rules.
 *
 * ## CANONICAL: `selectMostEfficientLadderStep` (shipped behavior)
 * - **Candidates**: fixed ladder amounts in `LADDER_INVESTMENT_STEPS`.
 * - **Underwater only**: returns null when `currentPrice >= avgCost` (no avg reduction at that buy price).
 * - **Tiny impact**: steps with `avgImprovement < MIN_AVG_IMPROVEMENT` (1e‑4) are excluded from the primary “viable” set.
 * - **Overkill**: when position value `shares × currentPrice > 0`, steps with `amount > OVERKILL_FRACTION × position value`
 *   (0.5) are excluded from the viable set.
 * - **Primary pick**: among viable steps, choose **maximum `improvementPerDollar`** (avg improvement per $ of gross budget).
 * - **Fallbacks** (in order): viable empty → use `$500` rung if it has non‑tiny improvement; else best positive
 *   `avgImprovement`; else first ladder row.
 *
 * Older narrative product drafts (e.g. 2%/5% of avg thresholds, top‑2 efficiency ties, 3× median overkill) are
 * **not** implemented; change this block and UI copy together if that changes.
 */

import type { FeeType, Holding } from "@/lib/storage";

/** Budget rungs shown in the budget-step simulator and used for ladder-based portfolio comparisons */
export const LADDER_INVESTMENT_STEPS = [250, 500, 1000, 2500] as const;

/** Fixed test size for standardized efficiency score (Insights) and copy */
export const STANDARD_TEST_INVESTMENT = 500;

const MIN_AVG_IMPROVEMENT = 1e-4;
/** Skip ladder steps larger than this fraction of current position market value (overkill) */
const OVERKILL_FRACTION = 0.5;

export type DcaRow = {
  amount: number;
  sharesBought: number;
  newAvg: number;
  avgImprovement: number;
  /** Average improvement per $1 of simulated spend (same units as avgImprovement / amount) */
  improvementPerDollar: number;
};

/**
 * Lump-sum buy at `price` spending `grossBudget` total (including fees when included).
 * Matches simple calculator semantics: fee reduces shares bought.
 */
export function computeDcaRow(
  shares: number,
  avgCost: number,
  currentPrice: number,
  grossBudget: number,
  opts?: {
    includeFees?: boolean;
    feeType?: FeeType;
    feeValue?: number;
  }
): DcaRow | null {
  if (currentPrice <= 0 || grossBudget <= 0) return null;

  const includeFees = opts?.includeFees ?? false;
  const feeType = opts?.feeType ?? "flat";
  const feeValue = Number(opts?.feeValue ?? 0);

  let budgetForStock = grossBudget;
  let totalSpend = grossBudget;

  if (includeFees && feeValue > 0) {
    if (feeType === "percent") {
      budgetForStock = grossBudget / (1 + feeValue / 100);
      totalSpend = grossBudget;
    } else {
      budgetForStock = Math.max(0, grossBudget - feeValue);
      totalSpend = grossBudget;
    }
  }

  if (budgetForStock <= 0) return null;

  const sharesBought = budgetForStock / currentPrice;
  const newAvg = (shares * avgCost + totalSpend) / (shares + sharesBought);
  const avgImprovement = avgCost - newAvg;
  const improvementPerDollar = avgImprovement / grossBudget;

  return {
    amount: grossBudget,
    sharesBought,
    newAvg,
    avgImprovement,
    improvementPerDollar,
  };
}

/**
 * What-If / bulk apply: `grossAllocated` is total cash out (matches `computeDcaRow` when fees apply).
 * Returns fields compatible with `applyBuyToHolding`.
 */
export function computeWhatIfAllocationRow(
  holding: Holding,
  buyPrice: number,
  grossAllocated: number,
  includeFees: boolean
): {
  sharesBought: number;
  newTotalShares: number;
  newAvg: number;
  feeApplied: number;
  budgetInvested: number;
  totalSpend: number;
} | null {
  if (buyPrice <= 0 || grossAllocated <= 0) return null;
  const row = computeDcaRow(
    holding.shares,
    holding.avg_cost,
    buyPrice,
    grossAllocated,
    holdingFeeOpts(holding, includeFees)
  );
  if (!row) return null;
  const budgetForStock = row.sharesBought * buyPrice;
  const feeApplied = Math.round(Math.max(0, grossAllocated - budgetForStock) * 100) / 100;
  const budgetInvested = Math.round(budgetForStock * 100) / 100;
  return {
    sharesBought: row.sharesBought,
    newTotalShares: holding.shares + row.sharesBought,
    newAvg: row.newAvg,
    feeApplied,
    budgetInvested,
    totalSpend: grossAllocated,
  };
}

export function buildLadderRows(
  shares: number,
  avgCost: number,
  currentPrice: number,
  opts?: { includeFees?: boolean; feeType?: FeeType; feeValue?: number }
): DcaRow[] {
  const rows: DcaRow[] = [];
  for (const amount of LADDER_INVESTMENT_STEPS) {
    const row = computeDcaRow(shares, avgCost, currentPrice, amount, opts);
    if (row) rows.push(row);
  }
  return rows;
}

/**
 * Pick one ladder step. See file header “CANONICAL” for exact rules.
 */
export function selectMostEfficientLadderStep(
  shares: number,
  avgCost: number,
  currentPrice: number,
  opts?: { includeFees?: boolean; feeType?: FeeType; feeValue?: number }
): DcaRow | null {
  if (currentPrice <= 0 || currentPrice >= avgCost) return null;

  const positionValue = shares * currentPrice;
  const rows = buildLadderRows(shares, avgCost, currentPrice, opts);

  const viable = rows.filter((r) => {
    if (r.avgImprovement < MIN_AVG_IMPROVEMENT) return false;
    if (positionValue > 0 && r.amount > OVERKILL_FRACTION * positionValue) return false;
    return true;
  });

  if (viable.length > 0) {
    return viable.reduce((best, r) =>
      r.improvementPerDollar > best.improvementPerDollar ? r : best
    );
  }

  const testRow = rows.find((r) => r.amount === STANDARD_TEST_INVESTMENT);
  if (testRow && testRow.avgImprovement >= MIN_AVG_IMPROVEMENT) return testRow;

  const any = rows.filter((r) => r.avgImprovement >= MIN_AVG_IMPROVEMENT);
  if (any.length > 0) return any.reduce((a, b) => (a.avgImprovement > b.avgImprovement ? a : b));

  return rows[0] ?? null;
}

/** Same formula as legacy Insights tab: improvement from a fixed test buy, score capped 0–100 */
export function computeStandardizedEfficiencyScore(
  shares: number,
  avgCost: number,
  marketPrice: number,
  opts?: { includeFees?: boolean; feeType?: FeeType; feeValue?: number; testAmount?: number }
): { score: number; improvement: number } {
  const amt = opts?.testAmount ?? STANDARD_TEST_INVESTMENT;
  if (marketPrice >= avgCost || avgCost <= 0) return { score: 0, improvement: 0 };
  const row = computeDcaRow(shares, avgCost, marketPrice, amt, opts);
  if (!row) return { score: 0, improvement: 0 };
  const improvement = Math.max(0, row.avgImprovement);
  const score = Math.max(0, Math.min(100, Math.round((improvement / avgCost) * 10_000)));
  return { score, improvement };
}

export function holdingFeeOpts(h: Holding, includeFees: boolean) {
  return {
    includeFees,
    feeType: h.fee_type,
    feeValue: Number(h.fee_value),
  };
}

/** One line of output from `greedyAllocateBudget`. */
export type GreedyAllocationLine = {
  holdingId: string;
  ticker: string;
  exchange: Holding["exchange"];
  allocated: number;
  initialAvg: number;
  newAvg: number;
  avgImprovementVsInitial: number;
};

/**
 * Capital Optimizer modes. Only `greedy_improvement_per_dollar` is implemented; others are explicit roadmap placeholders
 * so the UI does not imply a global optimum or a single hidden objective.
 */
export type CapitalOptimizerModeId =
  | "greedy_improvement_per_dollar"
  | "lowest_portfolio_average"
  | "reach_target_averages_first";

export const CAPITAL_OPTIMIZER_DEFAULT_MODE: CapitalOptimizerModeId = "greedy_improvement_per_dollar";

const MAX_GREEDY_ITERS = 10_000;

/**
 * Greedy budget split: repeatedly assign the next `chunk` dollars to the holding where that spend has the highest
 * modeled `improvementPerDollar`, updating simulated shares/avg after each chunk. Heuristic only — not globally optimal.
 * Skips holdings with no price, invalid price, or price ≥ current simulated average.
 */
export function greedyAllocateBudget(
  holdings: Holding[],
  priceByHoldingId: Record<string, number | null>,
  grossBudget: number,
  includeFees: boolean,
  opts?: { chunk?: number }
): { lines: GreedyAllocationLine[]; remainingBudget: number; usedBudget: number } {
  const chunk = opts?.chunk ?? 100;
  if (grossBudget <= 0 || holdings.length === 0) {
    return { lines: [], remainingBudget: grossBudget, usedBudget: 0 };
  }

  const state = new Map<string, { shares: number; avg: number }>();
  const initialAvg = new Map<string, number>();
  for (const h of holdings) {
    state.set(h.id, { shares: h.shares, avg: h.avg_cost });
    initialAvg.set(h.id, h.avg_cost);
  }
  const alloc = new Map<string, number>();

  let remaining = grossBudget;
  let iter = 0;

  while (remaining > 1e-9 && iter < MAX_GREEDY_ITERS) {
    iter++;
    const effectiveChunk = Math.min(chunk, remaining);
    if (effectiveChunk < 1e-6) break;

    let best: { h: Holding; row: DcaRow } | null = null;
    let bestEff = -Infinity;

    for (const h of holdings) {
      const price = priceByHoldingId[h.id];
      const st = state.get(h.id);
      if (st == null || price == null || price <= 0 || price >= st.avg) continue;
      const row = computeDcaRow(st.shares, st.avg, price, effectiveChunk, holdingFeeOpts(h, includeFees));
      if (!row || row.avgImprovement <= 1e-12) continue;
      if (row.improvementPerDollar > bestEff) {
        bestEff = row.improvementPerDollar;
        best = { h, row };
      }
    }

    if (!best) break;

    const { h, row } = best;
    const st = state.get(h.id)!;
    st.shares += row.sharesBought;
    st.avg = row.newAvg;
    alloc.set(h.id, (alloc.get(h.id) ?? 0) + effectiveChunk);
    remaining -= effectiveChunk;
  }

  const lines: GreedyAllocationLine[] = [];
  for (const h of holdings) {
    const a = alloc.get(h.id) ?? 0;
    if (a <= 0) continue;
    const st = state.get(h.id)!;
    const init = initialAvg.get(h.id)!;
    lines.push({
      holdingId: h.id,
      ticker: h.ticker,
      exchange: h.exchange,
      allocated: Math.round(a * 100) / 100,
      initialAvg: init,
      newAvg: st.avg,
      avgImprovementVsInitial: Math.max(0, init - st.avg),
    });
  }

  lines.sort((a, b) => b.allocated - a.allocated);

  const used = grossBudget - remaining;
  return {
    lines,
    remainingBudget: Math.round(remaining * 100) / 100,
    usedBudget: Math.round(used * 100) / 100,
  };
}
