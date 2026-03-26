import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ChevronDown,
  Save,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getCachedQuote } from "@/lib/stock-price";
import {
  addScenario,
  apiTicker,
  currencyPrefix,
  type Holding,
  type Scenario,
} from "@/lib/storage";
import {
  buildGoalLadder,
  type GoalLadderResult,
  type GoalStep,
  type TakeProfitStep,
} from "@/lib/goalLadder";
import { useSimFees } from "@/contexts/SimFeesContext";

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
  const { includeFees, setIncludeFees } = useSimFees();
  const cp = currencyPrefix(holding.exchange ?? "US");

  const currentPrice = useMemo(() => {
    const key = apiTicker(holding.ticker, holding.exchange ?? "US").toUpperCase();
    const q = getCachedQuote(key);
    return q?.price ?? null;
  }, [holding.exchange, holding.ticker]);

  const result: GoalLadderResult | null = useMemo(() => {
    if (currentPrice == null) return null;
    return buildGoalLadder(holding, currentPrice, includeFees);
  }, [currentPrice, holding, includeFees]);

  const handleUseInCalc = (method: string, v1: string, v2: string) => {
    if (onUseInCalculator) {
      onUseInCalculator(method, v1, v2);
      return;
    }

    navigate(`/holdings/${holding.id}/dca?method=${method}&val1=${v1}&val2=${v2}`);
  };

  const handleSaveStep = (step: GoalStep) => {
    const scenario: Omit<Scenario, "id" | "created_at"> = {
      holding_id: holding.id,
      ticker: holding.ticker,
      method: step.kind === "budget" ? "price_budget" : "price_target",
      input1_label: "Buy price",
      input1_value: step.buyPrice,
      input2_label:
        step.kind === "budget"
          ? "Max budget (shares only, excl. fee)"
          : "Target average cost",
      input2_value: step.kind === "budget" ? step.investment : step.targetAvg!,
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
      budget_percent_used: step.kind === "budget" ? 100 : null,
      notes:
        step.kind === "budget"
          ? `Goal Ladder: Invest ${cp}${fmt(step.investment)}`
          : `Goal Ladder: Target avg under ${cp}${fmt(step.targetAvg!)}`,
    };

    addScenario(scenario);
    toast({ title: "Scenario saved" });
    onSaved?.();
  };

  const calcParamsForStep = (step: GoalStep) =>
    step.kind === "budget"
      ? {
          method: "price_budget",
          v1: String(step.buyPrice),
          v2: String(step.investment),
        }
      : {
          method: "price_target",
          v1: String(step.buyPrice),
          v2: String(step.targetAvg),
        };

  if (currentPrice == null || result == null) {
    return (
      <div className="rounded-2xl border border-stitch-accent/25 bg-stitch-pill/40 p-5 font-mono text-sm text-stitch-muted">
        <h2 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-stitch-accent">
          <TrendingDown className="h-4 w-4" />
          Strategy simulator
        </h2>
        <p>
          Add a current market price from the Overview tab or{" "}
          <button
            type="button"
            onClick={() => navigate("/update-prices")}
            className="text-stitch-accent underline underline-offset-2 hover:opacity-90"
          >
            Update Prices
          </button>{" "}
          to see simulated DCA steps.
        </p>
      </div>
    );
  }

  if (result.isGreen) {
    return (
      <GreenPositionView
        avgCost={holding.avg_cost}
        cp={cp}
        currentPrice={currentPrice}
        shares={holding.shares}
        steps={result.takeProfitSteps}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-2xl border border-stitch-accent/25 bg-stitch-pill/40 px-4 py-3 font-mono text-sm">
        <Label htmlFor="goal-ladder-fees" className="cursor-pointer text-[11px] text-stitch-muted">
          Include fees in ladder math
        </Label>
        <Switch id="goal-ladder-fees" checked={includeFees} onCheckedChange={setIncludeFees} />
      </div>

      {result.nextBestMove && (
        <NextBestMoveCard
          avgCost={holding.avg_cost}
          cp={cp}
          onSave={() => handleSaveStep(result.nextBestMove!.step)}
          onUseInCalc={() => {
            const params = calcParamsForStep(result.nextBestMove!.step);
            handleUseInCalc(params.method, params.v1, params.v2);
          }}
          step={result.nextBestMove.step}
        />
      )}

      {result.budgetSteps.length > 0 && (
        <section className="rounded-2xl border border-stitch-accent/25 bg-stitch-pill/40 p-5 font-mono text-sm">
          <h2 className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-stitch-accent">
            <TrendingDown className="h-4 w-4" />
            Budget steps
          </h2>
          <p className="mb-4 text-[11px] text-stitch-muted/90">
            Uses preset dollar amounts at {cp}
            {fmt(currentPrice)}/share. Illustrative only, not a trade instruction.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {result.budgetSteps.map((step) => (
              <GoalStepCard
                key={`budget-${step.investment}`}
                avgCost={holding.avg_cost}
                cp={cp}
                isNextBestMove={result.nextBestMove?.step === step}
                onSave={() => handleSaveStep(step)}
                onUseInCalc={() => {
                  const params = calcParamsForStep(step);
                  handleUseInCalc(params.method, params.v1, params.v2);
                }}
                step={step}
              />
            ))}
          </div>
        </section>
      )}

      {result.targetSteps.length > 0 && (
        <section className="rounded-2xl border border-stitch-border/60 bg-stitch-pill/30 p-5 font-mono text-sm">
          <h2 className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-stitch-accent">
            <TrendingDown className="h-4 w-4" />
            Target averages
          </h2>
          <p className="mb-4 text-[11px] text-stitch-muted/90">
            What it takes to reach specific average-cost targets if shares are bought at {cp}
            {fmt(currentPrice)}.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {result.targetSteps.map((step) => (
              <GoalStepCard
                key={`target-${step.targetAvg}`}
                avgCost={holding.avg_cost}
                cp={cp}
                isNextBestMove={result.nextBestMove?.step === step}
                onSave={() => handleSaveStep(step)}
                onUseInCalc={() => {
                  const params = calcParamsForStep(step);
                  handleUseInCalc(params.method, params.v1, params.v2);
                }}
                step={step}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

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
    <div className="relative overflow-hidden rounded-2xl border border-stitch-accent/35 bg-stitch-card p-5 font-mono text-sm shadow-[0_0_24px_rgba(61,227,181,0.08)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-stitch-accent/10 via-transparent to-transparent" />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-stitch-accent">
          <Zap className="h-4 w-4" />
          Next best move
        </div>
        <p className="text-base font-semibold text-white">
          {step.kind === "target"
            ? `Target avg ${cp}${fmt(step.targetAvg!)}`
            : `Invest ${cp}${fmt(step.investment)}`}
        </p>
        <p className="mt-1 text-lg font-semibold text-white">
          Avg becomes {cp}
          {fmt(step.newAvgCost)}
        </p>
        <p className="mt-1 flex items-center gap-1 text-sm text-stitch-accent">
          <ArrowDownRight className="h-3.5 w-3.5" />
          Improves avg by {cp}
          {fmt(step.avgImprovement)}
        </p>
        <p className="mt-2 text-[11px] text-stitch-muted">
          Current avg {cp}
          {fmt(avgCost)}. Picked for modeled balance of impact and capital used.
        </p>
        <div className="mt-4 flex gap-2 border-t border-stitch-border/40 pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-stitch-accent hover:bg-stitch-accent/10 hover:text-stitch-accent"
            onClick={onUseInCalc}
          >
            <ArrowRight className="mr-1 h-3 w-3" />
            Use in calculator
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-stitch-muted hover:text-white"
            onClick={onSave}
          >
            <Save className="mr-1 h-3 w-3" />
            Save scenario
          </Button>
        </div>
      </div>
    </div>
  );
}

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
      ? "Best efficiency"
      : step.label === "biggest-impact"
        ? "Biggest impact"
        : step.label === "large-investment"
          ? "Large investment"
          : null;

  return (
    <div
      className={[
        "rounded-xl border p-4 transition-colors",
        isNextBestMove
          ? "border-stitch-accent/40 bg-stitch-accent/5"
          : "border-stitch-border/60 bg-stitch-card/60",
      ].join(" ")}
    >
      <div className="mb-2 flex min-h-[20px] items-center gap-2">
        {labelText && (
          <Badge
            variant={step.label === "large-investment" ? "destructive" : "outline"}
            className={
              step.label === "large-investment"
                ? "text-[10px]"
                : "border-stitch-accent/30 bg-stitch-accent/10 px-1.5 py-0 text-[10px] text-stitch-accent"
            }
          >
            {step.label === "large-investment" && <AlertTriangle className="mr-1 h-2.5 w-2.5" />}
            {labelText}
          </Badge>
        )}
        {isNextBestMove && (
          <Badge
            variant="outline"
            className="border-stitch-accent/30 px-1.5 py-0 text-[10px] text-stitch-accent"
          >
            <Zap className="mr-0.5 h-2.5 w-2.5" />
            Best move
          </Badge>
        )}
      </div>

      <p className="text-base font-semibold text-white">
        {step.kind === "target"
          ? `Target avg ${cp}${fmt(step.targetAvg!)}`
          : `Invest ${cp}${fmt(step.investment)}`}
      </p>
      <p className="mt-1 text-lg font-semibold text-white">
        Avg becomes {cp}
        {fmt(step.newAvgCost)}
      </p>
      <p className="mt-1 flex items-center gap-1 text-sm text-stitch-accent">
        <ArrowDownRight className="h-3.5 w-3.5" />
        Improves by {cp}
        {fmt(step.avgImprovement)}
        <span className="text-[11px] text-stitch-muted">
          ({step.avgImprovementPct.toFixed(1)}%)
        </span>
      </p>
      <p className="mt-2 text-[11px] text-stitch-muted">
        Current avg {cp}
        {fmt(avgCost)}
      </p>

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-2 flex items-center gap-1 text-[11px] text-stitch-muted transition-colors hover:text-white"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        Details
      </button>

      {expanded && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-stitch-border/40 pt-2 text-[11px] text-stitch-muted">
          <span>{step.kind === "budget" ? "Shares to buy" : "Shares needed"}</span>
          <span className="text-right text-white">{step.sharesBought.toFixed(4)}</span>
          {step.feeApplied > 0 && (
            <>
              <span>Fee</span>
              <span className="text-right text-white">
                {cp}
                {fmt(step.feeApplied)}
              </span>
            </>
          )}
          <span>Total spend</span>
          <span className="text-right text-white">
            {cp}
            {fmt(step.totalSpend)}
          </span>
        </div>
      )}

      <div className="mt-4 flex gap-2 border-t border-stitch-border/40 pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] text-stitch-muted hover:text-white"
          onClick={onUseInCalc}
        >
          <ArrowRight className="mr-1 h-3 w-3" />
          Use in calculator
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] text-stitch-muted hover:text-white"
          onClick={onSave}
        >
          <Save className="mr-1 h-3 w-3" />
          Save scenario
        </Button>
      </div>
    </div>
  );
}

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
      <div className="relative overflow-hidden rounded-2xl border border-stitch-accent/35 bg-stitch-card p-5 font-mono text-sm shadow-[0_0_24px_rgba(61,227,181,0.08)]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-stitch-accent/10 via-transparent to-transparent" />
        <div className="relative">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-stitch-accent">
            <TrendingUp className="h-4 w-4" />
            Position in profit
          </div>
          <p className="text-[11px] text-stitch-muted">
            Your average cost ({cp}
            {fmt(avgCost)}) is below the current price ({cp}
            {fmt(currentPrice)}). Here are illustrative take-profit checkpoints.
          </p>
          <div className="mt-4 flex gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-stitch-muted">Current gain</p>
              <p className="text-lg font-semibold text-stitch-accent">+{currentGain.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-stitch-muted">Unrealized profit</p>
              <p className="text-lg font-semibold text-stitch-accent">
                {cp}
                {fmt(currentProfit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {steps.length > 0 && (
        <section className="rounded-2xl border border-stitch-border/60 bg-stitch-pill/30 p-5 font-mono text-sm">
          <h2 className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-stitch-accent">
            <TrendingUp className="h-4 w-4" />
            Take-profit milestones
          </h2>
          <p className="mb-4 text-[11px] text-stitch-muted">
            Potential profit at different price targets. Informational only.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {steps.map((step) => (
              <TakeProfitCard key={step.targetPrice} avgCost={avgCost} cp={cp} step={step} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

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
    <div className="rounded-xl border border-stitch-border/60 bg-stitch-card/60 p-4">
      <p className="text-base font-semibold text-white">
        If price reaches {cp}
        {fmt(step.targetPrice)}
      </p>
      <p className="mt-1 text-lg font-semibold text-stitch-accent">+{step.gainPct.toFixed(1)}% gain</p>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-stitch-border/40 pt-2 text-[11px] text-stitch-muted">
        <span>Profit/share</span>
        <span className="text-right text-stitch-accent">
          {cp}
          {fmt(step.profitPerShare)}
        </span>
        <span>Total profit</span>
        <span className="text-right text-stitch-accent">
          {cp}
          {fmt(step.totalProfit)}
        </span>
        <span>Avg cost</span>
        <span className="text-right text-white">
          {cp}
          {fmt(avgCost)}
        </span>
      </div>
    </div>
  );
}
