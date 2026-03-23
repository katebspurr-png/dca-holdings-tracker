/**
 * Pure calculation functions for the Goal Ladder feature.
 * No React, no side-effects — just math.
 */
import type { Holding, FeeType } from "./storage";

// ── Types ────────────────────────────────────────────────────

export type PositionTier = "small" | "medium" | "large";

export interface GoalStep {
  kind: "budget" | "target";
  investment: number;
  buyPrice: number;
  sharesBought: number;
  feeApplied: number;
  totalSpend: number;
  newTotalShares: number;
  newAvgCost: number;
  avgImprovement: number; // avg_cost − new_avg  (absolute $)
  avgImprovementPct: number; // percentage reduction
  improvementPerDollar: number; // avgImprovement / investment
  label: "best-efficiency" | "biggest-impact" | "large-investment" | null;
  targetAvg?: number; // only for kind === "target"
}

export interface TakeProfitStep {
  targetPrice: number;
  gainPct: number; // (targetPrice − avgCost) / avgCost × 100
  profitPerShare: number;
  totalProfit: number;
}

export interface NextBestMove {
  step: GoalStep;
  score: number;
}

export interface GoalLadderResult {
  isGreen: boolean;
  positionTier: PositionTier;
  currentPrice: number;
  budgetSteps: GoalStep[];
  targetSteps: GoalStep[];
  nextBestMove: NextBestMove | null;
  takeProfitSteps: TakeProfitStep[];
}

// ── Helpers ──────────────────────────────────────────────────

export function getPositionTier(
  shares: number,
  currentPrice: number
): PositionTier {
  const mv = shares * currentPrice;
  if (mv < 1_000) return "small";
  if (mv < 10_000) return "medium";
  return "large";
}

export function getBudgetAmounts(tier: PositionTier): number[] {
  switch (tier) {
    case "small":
      return [100, 250, 500];
    case "medium":
      return [250, 500, 1_000];
    case "large":
      return [500, 1_000, 2_500];
  }
}

export function computeFee(
  feeType: FeeType,
  feeValue: number,
  budget: number
): number {
  if (feeType === "percent") return budget * (feeValue / 100);
  return feeValue;
}

// ── Budget step ──────────────────────────────────────────────

export function computeBudgetStep(
  h: Holding,
  budget: number,
  buyPrice: number,
  includeFees: boolean
): GoalStep | null {
  if (buyPrice <= 0 || budget <= 0) return null;

  const S = h.shares;
  const A = h.avg_cost;
  const x = budget / buyPrice;
  const f = includeFees ? computeFee(h.fee_type, h.fee_value, budget) : 0;
  const newAvg = (S * A + budget + f) / (S + x);
  const improvement = A - newAvg;
  if (improvement <= 0) return null;

  return {
    kind: "budget",
    investment: budget,
    buyPrice,
    sharesBought: x,
    feeApplied: f,
    totalSpend: budget + f,
    newTotalShares: S + x,
    newAvgCost: newAvg,
    avgImprovement: improvement,
    avgImprovementPct: A > 0 ? (improvement / A) * 100 : 0,
    improvementPerDollar: improvement / budget,
    label: null,
  };
}

// ── Target step ──────────────────────────────────────────────

/**
 * Round a target price according to magnitude rules.
 *   >= $1  → nearest $0.25
 *   <  $1  → nearest $0.05
 */
export function roundTarget(price: number): number {
  if (price >= 1) {
    return Math.round(price / 0.25) * 0.25;
  }
  return Math.round(price / 0.05) * 0.05;
}

/**
 * Generate 3 evenly-spaced target averages between currentPrice and avgCost.
 * Returns 2–3 values after rounding and filtering.
 */
export function generateTargetLevels(
  avgCost: number,
  currentPrice: number
): number[] {
  const gap = avgCost - currentPrice;
  if (gap <= 0) return [];

  const raw = [
    currentPrice + gap * 0.25, // 25 % of gap above currentPrice
    currentPrice + gap * 0.5, // 50 %
    currentPrice + gap * 0.75, // 75 %
  ];

  const seen = new Set<number>();
  return raw
    .map(roundTarget)
    .filter((t) => {
      if (t <= currentPrice || t >= avgCost) return false;
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
}

export function computeTargetStep(
  h: Holding,
  targetAvg: number,
  buyPrice: number,
  includeFees: boolean
): GoalStep | null {
  const S = h.shares;
  const A = h.avg_cost;
  if (targetAvg >= A || buyPrice >= targetAvg || buyPrice <= 0) return null;

  let B: number;
  let x: number;
  let f: number;

  if (h.fee_type === "percent" && includeFees) {
    const r = h.fee_value / 100;
    const den = 1 + r - targetAvg / buyPrice;
    if (den <= 0) return null;
    B = (S * (A - targetAvg)) / den;
    if (B <= 0) return null;
    x = B / buyPrice;
    f = computeFee(h.fee_type, h.fee_value, B);
  } else {
    f = includeFees ? computeFee(h.fee_type, h.fee_value, 0) : 0;
    const den = targetAvg - buyPrice;
    if (den <= 0) return null;
    x = (S * (A - targetAvg) + f) / den;
    if (x <= 0) return null;
    B = x * buyPrice;
  }

  const improvement = A - targetAvg;

  return {
    kind: "target",
    investment: B,
    buyPrice,
    sharesBought: x,
    feeApplied: includeFees ? computeFee(h.fee_type, h.fee_value, B) : 0,
    totalSpend: B + (includeFees ? computeFee(h.fee_type, h.fee_value, B) : 0),
    newTotalShares: S + x,
    newAvgCost: targetAvg,
    avgImprovement: improvement,
    avgImprovementPct: A > 0 ? (improvement / A) * 100 : 0,
    improvementPerDollar: B > 0 ? improvement / B : 0,
    label: B > 50_000 ? "large-investment" : null,
    targetAvg,
  };
}

// ── Labelling ────────────────────────────────────────────────

/**
 * Assign "best-efficiency" and "biggest-impact" labels to budget steps.
 * Only one label per step; if the same step wins both, use "best-efficiency".
 */
export function labelBudgetSteps(steps: GoalStep[]): GoalStep[] {
  if (steps.length === 0) return steps;

  let bestEffIdx = 0;
  let bestImpIdx = 0;

  for (let i = 1; i < steps.length; i++) {
    if (steps[i].improvementPerDollar > steps[bestEffIdx].improvementPerDollar)
      bestEffIdx = i;
    if (steps[i].avgImprovement > steps[bestImpIdx].avgImprovement)
      bestImpIdx = i;
  }

  return steps.map((s, i) => {
    if (i === bestEffIdx) return { ...s, label: "best-efficiency" as const };
    if (i === bestImpIdx) return { ...s, label: "biggest-impact" as const };
    return s;
  });
}

// ── Next Best Move ───────────────────────────────────────────

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function selectNextBestMove(allSteps: GoalStep[]): NextBestMove | null {
  if (allSteps.length === 0) return null;

  // Normalize to 0–1
  const improvements = allSteps.map((s) => s.avgImprovement);
  const efficiencies = allSteps.map((s) => s.improvementPerDollar);
  const investments = allSteps.map((s) => s.investment);

  const minImp = Math.min(...improvements);
  const maxImp = Math.max(...improvements);
  const minEff = Math.min(...efficiencies);
  const maxEff = Math.max(...efficiencies);
  const medInv = median(investments);

  const rangeImp = maxImp - minImp;
  const rangeEff = maxEff - minEff;

  let bestScore = -Infinity;
  let bestStep: GoalStep | null = null;

  for (const step of allSteps) {
    const normImp = rangeImp > 0 ? (step.avgImprovement - minImp) / rangeImp : 1;
    const normEff =
      rangeEff > 0 ? (step.improvementPerDollar - minEff) / rangeEff : 1;

    let score = normImp * 0.6 + normEff * 0.4;
    if (step.investment > medInv * 2) score *= 0.7;

    if (score > bestScore) {
      bestScore = score;
      bestStep = step;
    }
  }

  return bestStep ? { step: bestStep, score: bestScore } : null;
}

// ── Take-profit (green position) ─────────────────────────────

export function generateTakeProfitSteps(
  h: Holding,
  currentPrice: number
): TakeProfitStep[] {
  const A = h.avg_cost;
  // Milestones at 10%, 25%, 50% above current price
  const multipliers = [1.1, 1.25, 1.5];

  return multipliers.map((m) => {
    const target = roundTarget(currentPrice * m);
    const profitPerShare = target - A;
    return {
      targetPrice: target,
      gainPct: A > 0 ? ((target - A) / A) * 100 : 0,
      profitPerShare,
      totalProfit: profitPerShare * h.shares,
    };
  });
}

// ── Orchestrator ─────────────────────────────────────────────

export function buildGoalLadder(
  holding: Holding,
  currentPrice: number
): GoalLadderResult {
  const tier = getPositionTier(holding.shares, currentPrice);
  const isGreen = currentPrice >= holding.avg_cost;

  if (isGreen) {
    return {
      isGreen: true,
      positionTier: tier,
      currentPrice,
      budgetSteps: [],
      targetSteps: [],
      nextBestMove: null,
      takeProfitSteps: generateTakeProfitSteps(holding, currentPrice),
    };
  }

  const includeFees = holding.fee_value > 0;

  // Budget steps
  const budgetAmounts = getBudgetAmounts(tier);
  const rawBudget = budgetAmounts
    .map((b) => computeBudgetStep(holding, b, currentPrice, includeFees))
    .filter(Boolean) as GoalStep[];
  const budgetSteps = labelBudgetSteps(rawBudget);

  // Target steps
  const levels = generateTargetLevels(holding.avg_cost, currentPrice);
  const targetSteps = levels
    .map((t) => computeTargetStep(holding, t, currentPrice, includeFees))
    .filter(Boolean) as GoalStep[];

  // Next Best Move from combined set
  const allSteps = [...budgetSteps, ...targetSteps];
  const nextBestMove = selectNextBestMove(allSteps);

  return {
    isGreen: false,
    positionTier: tier,
    currentPrice,
    budgetSteps,
    targetSteps,
    nextBestMove,
    takeProfitSteps: [],
  };
}
