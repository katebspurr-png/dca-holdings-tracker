import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, ArrowRight, Save, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type Holding,
  currencyPrefix,
  addScenario,
} from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import {
  selectSuggestedStep,
  selectPortfolioSuggestedStep,
  type SuggestedStep,
  type PortfolioSuggestedStep,
} from "@/lib/strategy-step";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Per-Holding Mode ─────────────────────────────────────────

interface HoldingProps {
  mode: "holding";
  holding: Holding;
  currentPrice: number | null;
  onUseInCalculator?: (method: string, v1: string, v2: string) => void;
  onSaved?: () => void;
}

// ── Portfolio Mode ───────────────────────────────────────────

interface PortfolioProps {
  mode: "portfolio";
  holdings: Holding[];
  /** Per-holding live prices (same map as portfolio list); updates when prices refresh. */
  livePrices: Record<string, number | null>;
}

type Props = HoldingProps | PortfolioProps;

export default function SuggestedStrategyStep(props: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();

  if (props.mode === "holding") {
    return (
      <HoldingSuggestion
        holding={props.holding}
        currentPrice={props.currentPrice}
        onUseInCalculator={props.onUseInCalculator}
        onSaved={props.onSaved}
        navigate={navigate}
        toast={toast}
      />
    );
  }

  return (
    <PortfolioSuggestion
      holdings={props.holdings}
      livePrices={props.livePrices}
      navigate={navigate}
      toast={toast}
    />
  );
}

// ── Holding Suggestion ───────────────────────────────────────

function HoldingSuggestion({
  holding,
  currentPrice,
  onUseInCalculator,
  onSaved,
  navigate,
  toast,
}: {
  holding: Holding;
  currentPrice: number | null;
  onUseInCalculator?: (method: string, v1: string, v2: string) => void;
  onSaved?: () => void;
  navigate: ReturnType<typeof useNavigate>;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const step = useMemo(() => {
    if (currentPrice == null) return null;
    return selectSuggestedStep(holding, currentPrice);
  }, [holding, currentPrice]);

  if (!step || currentPrice == null) return null;

  const cp = currencyPrefix(holding.exchange ?? "US");

  const handleUseInCalc = () => {
    if (onUseInCalculator) {
      onUseInCalculator("price_budget", String(currentPrice), String(step.budget));
    } else {
      navigate(`/holdings/${holding.id}/dca?method=price_budget&val1=${currentPrice}&val2=${Math.round(step.budget)}`);
    }
  };

  const handleSave = () => {
    addScenario({
      holding_id: holding.id,
      ticker: holding.ticker,
      method: "price_budget",
      input1_label: "Buy price",
      input1_value: currentPrice,
      input2_label: "Max budget (shares only, excl. fee)",
      input2_value: step.budget,
      include_fees: holding.fee_value > 0,
      fee_amount: step.fee,
      buy_price: currentPrice,
      shares_to_buy: step.sharesToBuy,
      budget_invested: step.budget,
      fee_applied: step.fee,
      total_spend: step.totalSpend,
      new_total_shares: holding.shares + step.sharesToBuy,
      new_avg_cost: step.newAvg,
      recommended_target: null,
      budget_percent_used: 100,
      notes: `Suggested step: Invest ${cp}${fmt(step.budget)}`,
    });
    toast({ title: "Scenario saved" });
    onSaved?.();
  };

  return (
    <StepCard
      step={step}
      cp={cp}
      avgCost={holding.avg_cost}
      onUseInCalc={handleUseInCalc}
      onSave={handleSave}
    />
  );
}

// ── Portfolio Suggestion ─────────────────────────────────────

function PortfolioSuggestion({
  holdings,
  livePrices,
  navigate,
  toast,
}: {
  holdings: Holding[];
  livePrices: Record<string, number | null>;
  navigate: ReturnType<typeof useNavigate>;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const step = useMemo(() => {
    return selectPortfolioSuggestedStep(holdings, (h) => livePrices[h.id] ?? null);
  }, [holdings, livePrices]);

  if (!step) return null;

  const cp = currencyPrefix(step.exchange as any);

  const handleUseInCalc = () => {
    navigate(`/holdings/${step.holdingId}?tab=calculator&method=price_budget&val1=${step.currentPrice}&val2=${Math.round(step.budget)}`);
  };

  const handleSave = () => {
    const holding = holdings.find((h) => h.id === step.holdingId);
    if (!holding) return;
    addScenario({
      holding_id: step.holdingId,
      ticker: step.ticker,
      method: "price_budget",
      input1_label: "Buy price",
      input1_value: step.currentPrice,
      input2_label: "Max budget (shares only, excl. fee)",
      input2_value: step.budget,
      include_fees: holding.fee_value > 0,
      fee_amount: step.fee,
      buy_price: step.currentPrice,
      shares_to_buy: step.sharesToBuy,
      budget_invested: step.budget,
      fee_applied: step.fee,
      total_spend: step.totalSpend,
      new_total_shares: holding.shares + step.sharesToBuy,
      new_avg_cost: step.newAvg,
      recommended_target: null,
      budget_percent_used: 100,
      notes: `Suggested step: Invest ${cp}${fmt(step.budget)} in ${step.ticker}`,
    });
    toast({ title: "Scenario saved" });
  };

  return (
    <StepCard
      step={step}
      cp={cp}
      avgCost={step.avgCost}
      ticker={step.ticker}
      onUseInCalc={handleUseInCalc}
      onSave={handleSave}
    />
  );
}

// ── Shared Card ──────────────────────────────────────────────

function StepCard({
  step,
  cp,
  avgCost,
  ticker,
  onUseInCalc,
  onSave,
}: {
  step: SuggestedStep | PortfolioSuggestedStep;
  cp: string;
  avgCost: number;
  ticker?: string;
  onUseInCalc: () => void;
  onSave: () => void;
}) {
  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/[0.03] p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Suggested Strategy Step</h3>
        {ticker && (
          <Badge variant="outline" className="text-[9px] px-1 h-4 ml-1 font-mono">{ticker}</Badge>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-4 mb-2">
        <p className="text-base font-bold font-[family-name:var(--font-heading)]">
          Invest {cp}{fmt(step.budget)}
        </p>
        <p className="text-lg font-mono font-bold text-foreground">
          Avg becomes {cp}{fmt(step.newAvg)}
        </p>
      </div>

      {step.avgImprovement > 0 && (
        <p className="flex items-center gap-1 text-sm font-mono font-medium text-primary mb-1">
          <ArrowDownRight className="h-3.5 w-3.5" />
          improves by {cp}{fmt(step.avgImprovement)}
          <span className="text-muted-foreground/60 text-[11px] ml-1">
            ({(step.improvementPct * 100).toFixed(1)}%)
          </span>
        </p>
      )}

      <p className="text-[11px] text-muted-foreground/50 font-mono mt-1">
        Current avg {cp}{fmt(avgCost)}
      </p>

      <p className="text-[10px] text-muted-foreground/50 mt-2 italic">
        Based on impact and capital efficiency. For scenario planning only.
      </p>

      <div className="flex gap-2 mt-3 pt-2.5 border-t border-primary/10">
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
