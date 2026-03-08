import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Save, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Holding, type Scenario, addScenario, currencyPrefix } from "@/lib/storage";
import { getCachedQuote } from "@/lib/stock-price";
import { apiTicker } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_BUDGETS = [250, 500, 1000, 2500];

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function computeFee(feeType: string, feeValue: number, budget: number): number {
  if (feeType === "percent") return budget * (feeValue / 100);
  return feeValue;
}

interface BudgetScenario {
  budget: number;
  buyPrice: number;
  sharesToBuy: number;
  feeApplied: number;
  totalSpend: number;
  newTotalShares: number;
  newAvgCost: number;
  improvement: number; // percent reduction in avg cost
}

interface TargetScenario {
  targetAvg: number;
  buyPrice: number;
  sharesToBuy: number;
  budget: number;
  feeApplied: number;
  totalSpend: number;
  newTotalShares: number;
}

function computeBudgetScenario(
  h: Holding, budget: number, buyPrice: number, includeFees: boolean
): BudgetScenario | null {
  if (buyPrice <= 0 || budget <= 0) return null;
  const S = h.shares, A = h.avg_cost;
  const x = budget / buyPrice;
  const f = includeFees ? computeFee(h.fee_type, h.fee_value, budget) : 0;
  const newAvg = (S * A + budget + f) / (S + x);
  const improvement = A > 0 ? ((A - newAvg) / A) * 100 : 0;
  return {
    budget, buyPrice, sharesToBuy: x, feeApplied: f,
    totalSpend: budget + f, newTotalShares: S + x, newAvgCost: newAvg, improvement,
  };
}

function computeTargetScenario(
  h: Holding, targetAvg: number, buyPrice: number, includeFees: boolean
): TargetScenario | null {
  const S = h.shares, A = h.avg_cost;
  if (targetAvg >= A || buyPrice >= targetAvg || buyPrice <= 0) return null;

  let B: number, x: number, f: number;

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

  return {
    targetAvg, buyPrice, sharesToBuy: x, budget: B,
    feeApplied: includeFees ? computeFee(h.fee_type, h.fee_value, B) : 0,
    totalSpend: B + (includeFees ? computeFee(h.fee_type, h.fee_value, B) : 0),
    newTotalShares: S + x,
  };
}

function generateTargetLevels(avgCost: number, buyPrice: number): number[] {
  // 3 progressively ambitious targets between buyPrice and avgCost
  const gap = avgCost - buyPrice;
  if (gap <= 0) return [];
  return [
    Math.round((avgCost - gap * 0.15) * 100) / 100, // modest: 15% reduction
    Math.round((avgCost - gap * 0.35) * 100) / 100, // moderate: 35% reduction
    Math.round((avgCost - gap * 0.55) * 100) / 100, // ambitious: 55% reduction
  ].filter((t) => t > buyPrice && t < avgCost);
}

interface Props {
  holding: Holding;
  onUseInCalculator?: (method: string, val1: string, val2: string) => void;
  onSaved?: () => void;
}

export default function GoalLadder({ holding, onSaved }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const cp = currencyPrefix(holding.exchange ?? "US");

  // Get cached current price
  const currentPrice = useMemo(() => {
    const key = apiTicker(holding.ticker, (holding.exchange ?? "US") as any).toUpperCase();
    const q = getCachedQuote(key);
    return q?.price ?? null;
  }, [holding]);

  const includeFees = holding.fee_value > 0;

  const budgetScenarios = useMemo(() => {
    if (!currentPrice) return [];
    return DEFAULT_BUDGETS
      .map((b) => computeBudgetScenario(holding, b, currentPrice, includeFees))
      .filter(Boolean) as BudgetScenario[];
  }, [holding, currentPrice, includeFees]);

  const targetLevels = useMemo(
    () => (currentPrice ? generateTargetLevels(holding.avg_cost, currentPrice) : []),
    [holding.avg_cost, currentPrice]
  );

  const targetScenarios = useMemo(() => {
    if (!currentPrice) return [];
    return targetLevels
      .map((t) => computeTargetScenario(holding, t, currentPrice, includeFees))
      .filter(Boolean) as TargetScenario[];
  }, [holding, currentPrice, targetLevels, includeFees]);

  const handleUseInCalc = (method: string, v1: string, v2: string) => {
    navigate(`/holdings/${holding.id}/dca?method=${method}&val1=${v1}&val2=${v2}`);
  };

  const handleSaveBudget = (s: BudgetScenario) => {
    const scenario: Omit<Scenario, "id" | "created_at"> = {
      holding_id: holding.id,
      ticker: holding.ticker,
      method: "price_budget",
      input1_label: "Buy price",
      input1_value: s.buyPrice,
      input2_label: "Max budget (shares only, excl. fee)",
      input2_value: s.budget,
      include_fees: includeFees,
      fee_amount: s.feeApplied,
      buy_price: s.buyPrice,
      shares_to_buy: s.sharesToBuy,
      budget_invested: s.budget,
      fee_applied: s.feeApplied,
      total_spend: s.totalSpend,
      new_total_shares: s.newTotalShares,
      new_avg_cost: s.newAvgCost,
      recommended_target: null,
      budget_percent_used: 100,
      notes: `Goal Ladder: Invest ${cp}${fmt(s.budget)}`,
    };
    addScenario(scenario);
    toast({ title: "Scenario saved" });
    onSaved?.();
  };

  const handleSaveTarget = (s: TargetScenario) => {
    const scenario: Omit<Scenario, "id" | "created_at"> = {
      holding_id: holding.id,
      ticker: holding.ticker,
      method: "price_target",
      input1_label: "Buy price",
      input1_value: s.buyPrice,
      input2_label: "Target average cost",
      input2_value: s.targetAvg,
      include_fees: includeFees,
      fee_amount: s.feeApplied,
      buy_price: s.buyPrice,
      shares_to_buy: s.sharesToBuy,
      budget_invested: s.budget,
      fee_applied: s.feeApplied,
      total_spend: s.totalSpend,
      new_total_shares: s.newTotalShares,
      new_avg_cost: s.targetAvg,
      recommended_target: null,
      budget_percent_used: null,
      notes: `Goal Ladder: Target avg under ${cp}${fmt(s.targetAvg)}`,
    };
    addScenario(scenario);
    toast({ title: "Scenario saved" });
    onSaved?.();
  };

  if (!currentPrice) {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-primary" />
          Goal Ladder
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter a current market price on the{" "}
          <button
            onClick={() => navigate("/update-prices")}
            className="text-primary underline underline-offset-2 hover:opacity-80"
          >
            Update Prices
          </button>{" "}
          page to generate goal scenarios.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Budget Ladder */}
      <div className="rounded-xl border border-border bg-card/50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-primary" />
          Goal Ladder — Budget Scenarios
        </h2>
        <p className="text-[11px] text-muted-foreground/70 mb-4">
          What happens if you invest a fixed amount at {cp}{fmt(currentPrice)}/share. For scenario planning only.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {budgetScenarios.map((s) => (
            <div
              key={s.budget}
              className="group rounded-lg border border-border/60 bg-background/50 p-4 hover:border-primary/30 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-baseline justify-between mb-2.5">
                <span className="text-base font-bold font-[family-name:var(--font-heading)]">
                  Invest {cp}{fmt(s.budget)}
                </span>
                {s.improvement > 0 && (
                  <span className="text-[11px] font-medium text-primary font-[family-name:var(--font-mono)] tabular-nums">
                    −{s.improvement.toFixed(2)}% avg
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] font-[family-name:var(--font-mono)] tabular-nums">
                <div className="text-muted-foreground">Shares to buy</div>
                <div className="text-right">{s.sharesToBuy.toFixed(4)}</div>

                {s.feeApplied > 0 && (
                  <>
                    <div className="text-muted-foreground">Fee</div>
                    <div className="text-right">{cp}{fmt(s.feeApplied)}</div>
                  </>
                )}

                <div className="text-muted-foreground">Total spend</div>
                <div className="text-right">{cp}{fmt(s.totalSpend)}</div>

                <div className="text-muted-foreground">New avg cost</div>
                <div className="text-right font-medium text-foreground">{cp}{fmt(s.newAvgCost)}</div>
              </div>

              <div className="flex gap-2 mt-3 pt-2.5 border-t border-border/30">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => handleUseInCalc("price_budget", String(s.buyPrice), String(s.budget))}
                >
                  <ArrowRight className="mr-1 h-3 w-3" />
                  Use in calculator
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => handleSaveBudget(s)}
                >
                  <Save className="mr-1 h-3 w-3" />
                  Save scenario
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Target Ladder */}
      {targetScenarios.length > 0 && (
        <div className="rounded-xl border border-border bg-card/50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-primary" />
            Goal Ladder — Target Checkpoints
          </h2>
          <p className="text-[11px] text-muted-foreground/70 mb-4">
            What it takes to bring your average cost down to specific targets at {cp}{fmt(currentPrice)}/share.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {targetScenarios.map((s) => (
              <div
                key={s.targetAvg}
                className="group rounded-lg border border-border/60 bg-background/50 p-4 hover:border-primary/30 hover:bg-muted/20 transition-colors"
              >
                <div className="mb-2.5">
                  <span className="text-base font-bold font-[family-name:var(--font-heading)]">
                    Get avg under {cp}{fmt(s.targetAvg)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] font-[family-name:var(--font-mono)] tabular-nums">
                  <div className="text-muted-foreground">Shares needed</div>
                  <div className="text-right">{s.sharesToBuy.toFixed(4)}</div>

                  <div className="text-muted-foreground">Budget needed</div>
                  <div className="text-right">{cp}{fmt(s.budget)}</div>

                  {s.feeApplied > 0 && (
                    <>
                      <div className="text-muted-foreground">Fee</div>
                      <div className="text-right">{cp}{fmt(s.feeApplied)}</div>
                    </>
                  )}

                  <div className="text-muted-foreground">Total spend</div>
                  <div className="text-right font-medium text-foreground">{cp}{fmt(s.totalSpend)}</div>
                </div>

                <div className="flex gap-2 mt-3 pt-2.5 border-t border-border/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => handleUseInCalc("price_target", String(s.buyPrice), String(s.targetAvg))}
                  >
                    <ArrowRight className="mr-1 h-3 w-3" />
                    Use in calculator
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => handleSaveTarget(s)}
                  >
                    <Save className="mr-1 h-3 w-3" />
                    Save scenario
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
