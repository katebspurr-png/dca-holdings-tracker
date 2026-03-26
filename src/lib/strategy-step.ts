/**
 * Shared strategy utilities: efficiency scoring, adaptive budgets, and suggested step selection.
 */

import { computeDcaRow, holdingFeeOpts } from "./dca-sim";
import type { Holding } from "./storage";

const TEST_INVESTMENT = 500;

// ── Efficiency Score ─────────────────────────────────────────

export function computeEfficiencyScore(
  shares: number,
  avgCost: number,
  marketPrice: number,
): { score: number; improvement: number } {
  if (marketPrice >= avgCost || avgCost <= 0) return { score: 0, improvement: 0 };
  const sharesBought = TEST_INVESTMENT / marketPrice;
  const newAvg = (shares * avgCost + TEST_INVESTMENT) / (shares + sharesBought);
  const improvement = Math.max(0, avgCost - newAvg);
  const score = Math.max(0, Math.min(100, Math.round((improvement / avgCost) * 10_000)));
  return { score, improvement };
}

export function getEfficiencyBand(score: number): { label: string; colorClass: string } {
  if (score >= 80) return { label: "Very strong impact", colorClass: "text-primary" };
  if (score >= 60) return { label: "Strong impact", colorClass: "text-primary" };
  if (score >= 40) return { label: "Moderate impact", colorClass: "text-muted-foreground" };
  if (score >= 20) return { label: "Weak impact", colorClass: "text-muted-foreground" };
  return { label: "Minimal impact", colorClass: "text-destructive" };
}

// ── Adaptive Budgets ─────────────────────────────────────────

export function getAdaptiveBudgets(shares: number, currentPrice: number): number[] {
  const marketValue = shares * currentPrice;
  if (marketValue < 1000) return [100, 250, 500];
  if (marketValue <= 10000) return [250, 500, 1000];
  return [500, 1000, 2500];
}

// ── Suggested Strategy Step ──────────────────────────────────

export type SuggestedStep = {
  budget: number;
  newAvg: number;
  avgImprovement: number;
  improvementPct: number;
  efficiency: number; // avg_improvement per dollar
  sharesToBuy: number;
  fee: number;
  totalSpend: number;
};

export type PortfolioSuggestedStep = SuggestedStep & {
  holdingId: string;
  ticker: string;
  exchange: string;
  avgCost: number;
  currentPrice: number;
};

function computeStepForBudget(
  holding: Holding,
  budget: number,
  currentPrice: number,
  includeFees: boolean,
): SuggestedStep | null {
  const S = holding.shares;
  const A = holding.avg_cost;
  if (currentPrice >= A || currentPrice <= 0 || budget <= 0) return null;

  const row = computeDcaRow(S, A, currentPrice, budget, holdingFeeOpts(holding, includeFees));
  if (!row) return null;

  const budgetForStock = row.sharesBought * currentPrice;
  const fee = Math.round(Math.max(0, budget - budgetForStock) * 100) / 100;
  const totalSpend = budget;
  const avgImprovement = row.avgImprovement;
  const improvementPct = A > 0 ? avgImprovement / A : 0;
  const efficiency = totalSpend > 0 ? avgImprovement / totalSpend : 0;

  return {
    budget,
    newAvg: row.newAvg,
    avgImprovement,
    improvementPct,
    efficiency,
    sharesToBuy: row.sharesBought,
    fee,
    totalSpend,
  };
}

export function selectSuggestedStep(
  holding: Holding,
  currentPrice: number,
  includeFees: boolean,
): SuggestedStep | null {
  if (currentPrice >= holding.avg_cost || currentPrice <= 0) return null;

  const budgets = getAdaptiveBudgets(holding.shares, currentPrice);
  const steps = budgets
    .map((b) => computeStepForBudget(holding, b, currentPrice, includeFees))
    .filter((s): s is SuggestedStep => s !== null);

  if (steps.length === 0) return null;

  // Filter out tiny steps
  const minImprovement = Math.max(0.02 * holding.avg_cost, 0.10);
  const meaningful = steps.filter((s) => s.avgImprovement >= minImprovement);
  if (meaningful.length === 0) return null;

  // Sort by efficiency (descending)
  meaningful.sort((a, b) => b.efficiency - a.efficiency);

  // Pick the step with best efficiency that also has >= 5% improvement,
  // or fall back to the most efficient step
  const impactful = meaningful.find((s) => s.improvementPct >= 0.05);
  const selected = impactful ?? meaningful[0];

  // Overkill protection: skip if budget is > 3x median and not the most efficient
  const sortedBudgets = [...budgets].sort((a, b) => a - b);
  const median = sortedBudgets[Math.floor(sortedBudgets.length / 2)];
  if (selected.budget > 3 * median && selected !== meaningful[0]) {
    return meaningful[0];
  }

  return selected;
}

export function selectPortfolioSuggestedStep(
  holdings: Holding[],
  getPriceForHolding: (h: Holding) => number | null,
  includeFees: boolean,
): PortfolioSuggestedStep | null {
  let best: PortfolioSuggestedStep | null = null;

  for (const h of holdings) {
    const price = getPriceForHolding(h);
    if (price == null || price <= 0) continue;

    const step = selectSuggestedStep(h, price, includeFees);
    if (!step) continue;

    const candidate: PortfolioSuggestedStep = {
      ...step,
      holdingId: h.id,
      ticker: h.ticker,
      exchange: h.exchange,
      avgCost: h.avg_cost,
      currentPrice: price,
    };

    if (!best || candidate.efficiency > best.efficiency) {
      best = candidate;
    }
  }

  return best;
}
