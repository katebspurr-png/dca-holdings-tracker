import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Save,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ArrowDownRight,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type Holding,
  type Scenario,
  addScenario,
  currencyPrefix,
  apiTicker,
} from "@/lib/storage";
import { getCachedQuote } from "@/lib/stock-price";
import { useToast } from "@/hooks/use-toast";
import {
  buildGoalLadder,
  type GoalStep,
  type GoalLadderResult,
  type TakeProfitStep,
} from "@/lib/goalLadder";

const fmt = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

interface Props {
  holding: Holding;
  onUseInCalculator?: (method: string, val1: string, val2: string) => void;
  onSaved?: () => void;
}

export default function GoalLadder({
  holding,
  onUseInCalculator,
  onSaved,
}: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const cp = currencyPrefix(holding.exchange ?? "US");

  const currentPrice = useMemo(() => {
    const key = apiTicker(
      holding.ticker,
      (holding.exchange ?? "US") as any
    ).toUpperCase();
    const q = getCachedQuote(key);
    return q?.price ?? null;
  }, [holding]);

  const result: GoalLadderResult | null = useMemo(() => {
    if (!currentPrice) return null;
    return buildGoalLadder(holding, currentPrice);
  }, [holding, currentPrice]);

  const handleUseInCalc = (method: string, v1: string, v2: string) => {
    if (onUseInCalculator) {
      onUseInCalculator(method, v1, v2);
    } else {
      navigate(
        `/holdings/${holding.id}/dca?method=${method}&val1=${v1}&val2=${v2}`
      );
    }
  };

  const handleSaveStep = (step: GoalStep) => {
    const includeFees = holding.fee_value > 0;
    if (step.kind === "budget") {
      const scenario: Omit<Scenario, "id" | "created_at"> = {
        holding_id: holding.id,
        ticker: holding.ticker,
        method: "price_budget",
        input1_label: "Buy price",
        input1_value: step.buyPrice,
        input2_label: "Max budget (shares only, excl. fee)",
        input2_value: step.investment,
        include_fees: includeFees,
        fee_amount: step.feeApplied,
        buy_price: step.buyPrice,
        shares_to_buy: step.sharesBought,
        budget_invested: step.investment,
        fee_applied: step.feeApplied,
        total_spend: step.totalSpend,
        new_total_shares: step.newTotalShares,
        new_avg_cost: step.newAvgCost,
        recommended_target: null,
        budget_percent_used: 100,
        notes: `Goal Ladder: Invest ${cp}${fmt(step.investment)}`,
      };
      addScenario(scenario);
    } else {
      const scenario: Omit<Scenario, "id" | "created_at"> = {
        holding_id: holding.id,
        ticker: holding.ticker,
        method: "price_target",
        input1_label: "Buy price",
        input1_value: step.buyPrice,
        input2_label: "Target average cost",
        input2_value: step.targetAvg!,
        include_fees: includeFees,
        fee_amount: step.feeApplied,
        buy_price: step.buyPrice,
        shares_to_buy: step.sharesBought,
        budget_invested: step.investment,
        fee_applied: step.feeApplied,
        total_spend: step.totalSpend,
        new_total_shares: step.newTotalShares,
        new_avg_cost: step.newAvgCost,
        recommended_target: null,
        budget_percent_used: null,
        notes: `Goal Ladder: Target avg under ${cp}${fmt(step.targetAvg!)}`,
      };
      addScenario(scenario);
    }
    toast({ title: "Scenario saved" });
    onSaved?.();
  };

  const calcParamsForStep = (step: GoalStep) => {
    if (step.kind === "budget") {
      return {
        method: "price_budget",
        v1: String(step.buyPrice),
        v2: String(step.investment),
      };
    }
    return {
      method: "price_target",
      v1: String(step.buyPrice),
      v2: String(step.targetAvg),
    };
  };

  // ── No price available ──
  if (!currentPrice || !result) {
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

  // ── Green position: take-profit view ──
  if (result.isGreen) {
    return (
      <GreenPositionView
        steps={result.takeProfitSteps}
        cp={cp}
        avgCost={holding.avg_cost}
        currentPrice={currentPrice}
        shares={holding.shares}
      />
    );
  }

  // ── Red position: Next Best Move + Budget & Target steps ──
  return (
    <div className="space-y-5">
      {/* Next Best Move */}
      {result.nextBestMove && (
        <NextBestMoveCard
          step={result.nextBestMove.step}
          cp={cp}
          avgCost={holding.avg_cost}
          onUseInCalc={() => {
            const p = calcParamsForStep(result.nextBestMove!.step);
            handleUseInCalc(p.method, p.v1, p.v2);
          }}
          onSave={() => handleSaveStep(result.nextBestMove!.step)}
        />
      )}

      {/* Other Strategy Steps heading */}
      {(result.budgetSteps.length > 0 || result.targetSteps.length > 0) && (
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Other Strategy Steps
        </h2>
      )}

      {/* Budget Steps */}
      {result.budgetSteps.length > 0 && (
        <div className="rounded-xl border border-border bg-card/50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-primary" />
            Budget Steps
          </h2>
          <p className="text-[11px] text-muted-foreground/70 mb-4">
            Impact of investing at {cp}
            {fmt(currentPrice)}/share. For scenario planning only.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {result.budgetSteps.map((step) => (
              <GoalStepCard
                key={`b-${step.investment}`}
                step={step}
                cp={cp}
                avgCost={holding.avg_cost}
                isNextBestMove={
                  result.nextBestMove?.step === step
                }
                onUseInCalc={() => {
                  const p = calcParamsForStep(step);
                  handleUseInCalc(p.method, p.v1, p.v2);
                }}
                onSave={() => handleSaveStep(step)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Target Averages */}
      {result.targetSteps.length > 0 && (
        <div className="rounded-xl border border-border bg-card/50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-primary" />
            Target Averages
          </h2>
          <p className="text-[11px] text-muted-foreground/70 mb-4">
            What it takes to reach specific average cost targets at {cp}
            {fmt(currentPrice)}/share.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {result.targetSteps.map((step) => (
              <GoalStepCard
                key={`t-${step.targetAvg}`}
                step={step}
                cp={cp}
                avgCost={holding.avg_cost}
                isNextBestMove={
                  result.nextBestMove?.step === step
                }
                onUseInCalc={() => {
                  const p = calcParamsForStep(step);
                  handleUseInCalc(p.method, p.v1, p.v2);
                }}
                onSave={() => handleSaveStep(step)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Next Best Move Card ──────────────────────────────────── */

function NextBestMoveCard({
  step,
  cp,
  avgCost,
  onUseInCalc,
  onSave,
}: {
  step: GoalStep;
  cp: string;
  avgCost: number;
  onUseInCalc: () => void;
  onSave: () => void;
}) {
  return (
    <div className="rounded-xl border border-primary/40 bg-card/50 p-5 shadow-[0_0_24px_hsl(160_60%_52%/0.08)] relative overflow-hidden">
      {/* Subtle glow accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            Next Best Move
          </span>
        </div>

        {/* Investment amount */}
        <p className="text-base font-bold font-[family-name:var(--font-heading)]">
          {step.kind === "target"
            ? `Target avg ${cp}${fmt(step.targetAvg!)}`
            : `Invest ${cp}${fmt(step.investment)}`}
        </p>

        {/* New average */}
        <p className="text-lg font-mono font-bold text-foreground mt-1">
          Avg becomes {cp}
          {fmt(step.newAvgCost)}
        </p>

        {/* Improvement */}
        {step.avgImprovement > 0 && (
          <p className="flex items-center gap-1 text-sm font-mono font-medium text-primary mt-1">
            <ArrowDownRight className="h-3.5 w-3.5" />
            Improves avg by {cp}
            {fmt(step.avgImprovement)}
          </p>
        )}

        {/* Tagline */}
        <p className="text-[11px] text-muted-foreground/70 mt-2">
          Best balance of impact and capital used
        </p>

        {/* Actions */}
        <div className="flex gap-2 mt-3 pt-2.5 border-t border-primary/20">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-primary hover:text-primary hover:bg-primary/10"
            onClick={onUseInCalc}
          >
            <ArrowRight className="mr-1 h-3 w-3" />
            Use in Calculator
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={onSave}
          >
            <Save className="mr-1 h-3 w-3" />
            Save Scenario
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Unified Goal Step Card ───────────────────────────────── */

function GoalStepCard({
  step,
  cp,
  avgCost,
  isNextBestMove,
  onUseInCalc,
  onSave,
}: {
  step: GoalStep;
  cp: string;
  avgCost: number;
  isNextBestMove: boolean;
  onUseInCalc: () => void;
  onSave: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const labelText =
    step.label === "best-efficiency"
      ? "Best Efficiency"
      : step.label === "biggest-impact"
        ? "Biggest Impact"
        : step.label === "large-investment"
          ? "Large investment required"
          : null;

  const labelVariant =
    step.label === "large-investment" ? "destructive" : "default";

  return (
    <div
      className={`group rounded-lg border bg-background/50 p-4 hover:border-primary/30 hover:bg-muted/20 transition-colors ${
        isNextBestMove
          ? "border-primary/30 ring-1 ring-primary/20"
          : "border-border/60"
      }`}
    >
      {/* Badge row */}
      <div className="flex items-center gap-2 mb-1 min-h-[20px]">
        {labelText && (
          <Badge
            variant={labelVariant}
            className={`text-[10px] px-1.5 py-0 ${
              step.label === "large-investment"
                ? ""
                : "bg-primary/15 text-primary border-primary/30 hover:bg-primary/20"
            }`}
          >
            {step.label === "large-investment" && (
              <AlertTriangle className="mr-1 h-2.5 w-2.5" />
            )}
            {labelText}
          </Badge>
        )}
        {isNextBestMove && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-primary/30 text-primary"
          >
            <Zap className="mr-0.5 h-2.5 w-2.5" />
            Best Move
          </Badge>
        )}
      </div>

      {/* Primary: Investment amount or target */}
      <p className="text-base font-bold font-[family-name:var(--font-heading)]">
        {step.kind === "target"
          ? `Invest ${cp}${fmt(step.investment)}`
          : `Invest ${cp}${fmt(step.investment)}`}
      </p>

      {/* Primary: Resulting average */}
      <p className="text-lg font-mono font-bold text-foreground mt-1">
        Avg becomes {cp}
        {fmt(step.newAvgCost)}
      </p>

      {/* Improvement indicator */}
      {step.avgImprovement > 0 && (
        <p className="flex items-center gap-1 text-sm font-mono font-medium text-primary mt-1">
          <ArrowDownRight className="h-3.5 w-3.5" />
          improves by {cp}
          {fmt(step.avgImprovement)}
          <span className="text-muted-foreground/60 text-[11px] ml-1">
            ({step.avgImprovementPct.toFixed(1)}%)
          </span>
        </p>
      )}

      {/* Current avg reference */}
      <p className="text-[11px] text-muted-foreground/50 font-mono mt-2">
        Current avg {cp}
        {fmt(avgCost)}
      </p>

      {/* Expandable detail */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground mt-2 transition-colors"
      >
        <ChevronDown
          className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
        Details
      </button>
      {expanded && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-muted-foreground mt-2 pt-2 border-t border-border/30">
          <span>{step.kind === "budget" ? "Shares to buy" : "Shares needed"}</span>
          <span className="text-right">{step.sharesBought.toFixed(4)}</span>
          {step.feeApplied > 0 && (
            <>
              <span>Fee</span>
              <span className="text-right">
                {cp}
                {fmt(step.feeApplied)}
              </span>
            </>
          )}
          <span>Total spend</span>
          <span className="text-right">
            {cp}
            {fmt(step.totalSpend)}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-2.5 border-t border-border/30">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={onUseInCalc}
        >
          <ArrowRight className="mr-1 h-3 w-3" />
          Use in calculator
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={onSave}
        >
          <Save className="mr-1 h-3 w-3" />
          Save scenario
        </Button>
      </div>
    </div>
  );
}

/* ── Green Position View (Take-Profit) ────────────────────── */

function GreenPositionView({
  steps,
  cp,
  avgCost,
  currentPrice,
  shares,
}: {
  steps: TakeProfitStep[];
  cp: string;
  avgCost: number;
  currentPrice: number;
  shares: number;
}) {
  const currentGain = ((currentPrice - avgCost) / avgCost) * 100;
  const currentProfit = (currentPrice - avgCost) * shares;

  return (
    <div className="space-y-5">
      {/* Position in Profit header card */}
      <div className="rounded-xl border border-primary/40 bg-card/50 p-5 shadow-[0_0_24px_hsl(160_60%_52%/0.08)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">
              Position in Profit
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            Your average cost ({cp}
            {fmt(avgCost)}) is below the current price ({cp}
            {fmt(currentPrice)}). Here are potential take-profit scenarios.
          </p>
          <div className="flex gap-6 mt-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                Current Gain
              </p>
              <p className="text-lg font-mono font-bold text-primary">
                +{currentGain.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                Unrealized Profit
              </p>
              <p className="text-lg font-mono font-bold text-primary">
                {cp}
                {fmt(currentProfit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Take-profit milestone cards */}
      {steps.length > 0 && (
        <div className="rounded-xl border border-border bg-card/50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Take-Profit Milestones
          </h2>
          <p className="text-[11px] text-muted-foreground/70 mb-4">
            Potential profit at different price targets. For informational
            purposes only.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {steps.map((s) => (
              <TakeProfitCard
                key={s.targetPrice}
                step={s}
                cp={cp}
                avgCost={avgCost}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Take-Profit Card ─────────────────────────────────────── */

function TakeProfitCard({
  step,
  cp,
  avgCost,
}: {
  step: TakeProfitStep;
  cp: string;
  avgCost: number;
}) {
  return (
    <div className="group rounded-lg border border-border/60 bg-background/50 p-4 hover:border-primary/30 hover:bg-muted/20 transition-colors">
      {/* Target price */}
      <p className="text-base font-bold font-[family-name:var(--font-heading)]">
        If price reaches {cp}
        {fmt(step.targetPrice)}
      </p>

      {/* Gain % */}
      <p className="text-lg font-mono font-bold text-primary mt-1">
        +{step.gainPct.toFixed(1)}% gain
      </p>

      {/* Profit details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-muted-foreground mt-3 pt-2 border-t border-border/30">
        <span>Profit/share</span>
        <span className="text-right text-primary">
          {cp}
          {fmt(step.profitPerShare)}
        </span>
        <span>Total profit</span>
        <span className="text-right text-primary">
          {cp}
          {fmt(step.totalProfit)}
        </span>
        <span>Avg cost</span>
        <span className="text-right">
          {cp}
          {fmt(avgCost)}
        </span>
      </div>
    </div>
  );
}
