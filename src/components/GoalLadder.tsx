import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Save, TrendingDown, ChevronDown, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Holding, type Scenario, addScenario, currencyPrefix } from "@/lib/storage";
import { getCachedQuote } from "@/lib/stock-price";
import { apiTicker } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

function getAdaptiveBudgets(shares: number, currentPrice: number): number[] {
  const marketValue = shares * currentPrice;
  if (marketValue < 1000) return [100, 250, 500];
  if (marketValue <= 10000) return [250, 500, 1000];
  return [500, 1000, 2500];
}

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

export default function GoalLadder({ holding, onUseInCalculator, onSaved }: Props) {
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
    return getAdaptiveBudgets(holding.shares, currentPrice)
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
    if (onUseInCalculator) {
      onUseInCalculator(method, v1, v2);
    } else {
      navigate(`/holdings/${holding.id}/dca?method=${method}&val1=${v1}&val2=${v2}`);
    }
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
          Impact of investing at {cp}{fmt(currentPrice)}/share. For scenario planning only.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {budgetScenarios.map((s) => (
            <BudgetCard
              key={s.budget}
              scenario={s}
              cp={cp}
              avgCost={holding.avg_cost}
              onUseInCalc={() => handleUseInCalc("price_budget", String(s.buyPrice), String(s.budget))}
              onSave={() => handleSaveBudget(s)}
            />
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
        These are scenario simulations, not financial advice.
      </p>

      {/* Target Ladder */}
      {targetScenarios.length > 0 && (
        <div className="rounded-xl border border-border bg-card/50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-primary" />
            Goal Ladder — Target Checkpoints
          </h2>
          <p className="text-[11px] text-muted-foreground/70 mb-4">
            What it takes to reach specific average cost targets at {cp}{fmt(currentPrice)}/share.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {targetScenarios.map((s) => (
              <TargetCard
                key={s.targetAvg}
                scenario={s}
                cp={cp}
                avgCost={holding.avg_cost}
                onUseInCalc={() => handleUseInCalc("price_target", String(s.buyPrice), String(s.targetAvg))}
                onSave={() => handleSaveTarget(s)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Budget Card ─────────────────────────────────────────── */
function BudgetCard({
  scenario: s,
  cp,
  avgCost,
  onUseInCalc,
  onSave,
}: {
  scenario: BudgetScenario;
  cp: string;
  avgCost: number;
  onUseInCalc: () => void;
  onSave: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const improvementDollar = avgCost - s.newAvgCost;

  return (
    <div className="group rounded-lg border border-border/60 bg-background/50 p-4 hover:border-primary/30 hover:bg-muted/20 transition-colors">
      {/* Primary: Investment amount */}
      <p className="text-base font-bold font-[family-name:var(--font-heading)]">
        Invest {cp}{fmt(s.budget)}
      </p>

      {/* Primary: Resulting average */}
      <p className="text-lg font-mono font-bold text-foreground mt-1">
        Avg becomes {cp}{fmt(s.newAvgCost)}
      </p>

      {/* Improvement indicator */}
      {improvementDollar > 0 && (
        <p className="flex items-center gap-1 text-sm font-mono font-medium text-primary mt-1">
          <ArrowDownRight className="h-3.5 w-3.5" />
          improves by {cp}{fmt(improvementDollar)}
          <span className="text-muted-foreground/60 text-[11px] ml-1">({s.improvement.toFixed(1)}%)</span>
        </p>
      )}

      {/* Current avg reference */}
      <p className="text-[11px] text-muted-foreground/50 font-mono mt-2">
        Current avg {cp}{fmt(avgCost)}
      </p>

      {/* Expandable detail */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground mt-2 transition-colors"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        Details
      </button>
      {expanded && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-muted-foreground mt-2 pt-2 border-t border-border/30">
          <span>Shares to buy</span>
          <span className="text-right">{s.sharesToBuy.toFixed(4)}</span>
          {s.feeApplied > 0 && (
            <>
              <span>Fee</span>
              <span className="text-right">{cp}{fmt(s.feeApplied)}</span>
            </>
          )}
          <span>Total spend</span>
          <span className="text-right">{cp}{fmt(s.totalSpend)}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-2.5 border-t border-border/30">
        <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground hover:text-foreground" onClick={onUseInCalc}>
          <ArrowRight className="mr-1 h-3 w-3" />
          Use in calculator
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground hover:text-foreground" onClick={onSave}>
          <Save className="mr-1 h-3 w-3" />
          Save scenario
        </Button>
      </div>
    </div>
  );
}

/* ── Target Card ─────────────────────────────────────────── */
function TargetCard({
  scenario: s,
  cp,
  avgCost,
  onUseInCalc,
  onSave,
}: {
  scenario: TargetScenario;
  cp: string;
  avgCost: number;
  onUseInCalc: () => void;
  onSave: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const improvementDollar = avgCost - s.targetAvg;

  return (
    <div className="group rounded-lg border border-border/60 bg-background/50 p-4 hover:border-primary/30 hover:bg-muted/20 transition-colors">
      {/* Primary: Required investment */}
      <p className="text-base font-bold font-[family-name:var(--font-heading)]">
        Invest {cp}{fmt(s.budget)}
      </p>

      {/* Primary: Resulting average */}
      <p className="text-lg font-mono font-bold text-foreground mt-1">
        Avg becomes {cp}{fmt(s.targetAvg)}
      </p>

      {/* Improvement indicator */}
      {improvementDollar > 0 && (
        <p className="flex items-center gap-1 text-sm font-mono font-medium text-primary mt-1">
          <ArrowDownRight className="h-3.5 w-3.5" />
          improves by {cp}{fmt(improvementDollar)}
        </p>
      )}

      {/* Current avg reference */}
      <p className="text-[11px] text-muted-foreground/50 font-mono mt-2">
        Current avg {cp}{fmt(avgCost)}
      </p>

      {/* Expandable detail */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground mt-2 transition-colors"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        Details
      </button>
      {expanded && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-muted-foreground mt-2 pt-2 border-t border-border/30">
          <span>Shares needed</span>
          <span className="text-right">{s.sharesToBuy.toFixed(4)}</span>
          {s.feeApplied > 0 && (
            <>
              <span>Fee</span>
              <span className="text-right">{cp}{fmt(s.feeApplied)}</span>
            </>
          )}
          <span>Total spend</span>
          <span className="text-right">{cp}{fmt(s.totalSpend)}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-2.5 border-t border-border/30">
        <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground hover:text-foreground" onClick={onUseInCalc}>
          <ArrowRight className="mr-1 h-3 w-3" />
          Use in calculator
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground hover:text-foreground" onClick={onSave}>
          <Save className="mr-1 h-3 w-3" />
          Save scenario
        </Button>
      </div>
    </div>
  );
}
