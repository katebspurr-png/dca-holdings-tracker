import { useState, useMemo } from "react";
import { TrendingDown, Gauge, Users, ArrowRight, Save, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getHolding,
  getScenariosForHolding,
  addScenario,
} from "@/lib/storage";
import { canSaveScenario, FREE_SCENARIO_LIMIT } from "@/lib/feature-access";
import { useToast } from "@/hooks/use-toast";
import { useSimFees } from "@/contexts/SimFeesContext";
import {
  STANDARD_TEST_INVESTMENT,
  computeStandardizedEfficiencyScore,
  holdingFeeOpts,
} from "@/lib/dca-sim";

const fmt2 = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function computeRescueTarget(
  S: number, A: number, targetAvg: number, buyPrice: number,
  feeType: string, feeValue: number, includeFees: boolean
): { budget: number; shares: number; newAvg: number } | null {
  if (targetAvg >= A || buyPrice >= targetAvg || buyPrice <= 0) return null;
  let B: number, x: number;
  if (feeType === "percent" && includeFees) {
    const r = feeValue / 100;
    const den = 1 + r - targetAvg / buyPrice;
    if (den <= 0) return null;
    B = (S * (A - targetAvg)) / den;
    if (B <= 0) return null;
    x = B / buyPrice;
  } else {
    const f = includeFees && feeType === "flat" ? feeValue : 0;
    const den = targetAvg - buyPrice;
    if (den <= 0) return null;
    x = (S * (A - targetAvg) + f) / den;
    if (x <= 0) return null;
    B = x * buyPrice;
  }
  const f = includeFees ? (feeType === "percent" ? B * (feeValue / 100) : feeValue) : 0;
  const newAvg = (S * A + B + f) / (S + x);
  return { budget: B, shares: x, newAvg };
}

function getEfficiencyBand(score: number): { label: string; colorClass: string } {
  if (score >= 80) return { label: "Large avg move vs. cost", colorClass: "text-primary" };
  if (score >= 60) return { label: "Meaningful avg move", colorClass: "text-primary" };
  if (score >= 40) return { label: "Moderate avg move", colorClass: "text-muted-foreground" };
  if (score >= 20) return { label: "Small avg move", colorClass: "text-muted-foreground" };
  return { label: "Minimal / none", colorClass: "text-destructive" };
}

interface InsightsTabProps {
  holding: NonNullable<ReturnType<typeof getHolding>>;
  marketPrice: number | null;
  cp: string;
  onUseInCalculator: (method: string, v1: string, v2: string) => void;
  onSaved: () => void;
}

export default function InsightsTab({ holding, marketPrice, cp, onUseInCalculator, onSaved }: InsightsTabProps) {
  const S = Number(holding.shares);
  const A = Number(holding.avg_cost);
  const { includeFees } = useSimFees();
  const feeOpts = holdingFeeOpts(holding, includeFees);
  const { toast } = useToast();
  const [customTarget, setCustomTarget] = useState("");
  const [customError, setCustomError] = useState("");

  const rescueTargets = useMemo(() => {
    if (marketPrice == null || marketPrice >= A) return [];
    const gap = A - marketPrice;
    return [0.15, 0.35, 0.55]
      .map((pct) => {
        const target = Math.round((A - gap * pct) * 100) / 100;
        if (target <= marketPrice || target >= A) return null;
        const result = computeRescueTarget(S, A, target, marketPrice, holding.fee_type, Number(holding.fee_value), true);
        if (!result) return null;
        return { target, ...result };
      })
      .filter(Boolean) as { target: number; budget: number; shares: number; newAvg: number }[];
  }, [S, A, marketPrice, holding]);

  const customRescueResult = useMemo(() => {
    if (!customTarget || marketPrice == null) return null;
    const t = parseFloat(customTarget);
    if (isNaN(t)) return null;
    return computeRescueTarget(S, A, t, marketPrice, holding.fee_type, Number(holding.fee_value), true);
  }, [customTarget, S, A, marketPrice, holding]);

  const efficiencyData = useMemo(() => {
    if (marketPrice == null) return null;
    return computeStandardizedEfficiencyScore(S, A, marketPrice, {
      ...feeOpts,
      testAmount: STANDARD_TEST_INVESTMENT,
    });
  }, [S, A, marketPrice, feeOpts.includeFees, feeOpts.feeType, feeOpts.feeValue]);

  const startTodayDiff = useMemo(() => {
    if (marketPrice == null || A <= 0) return null;
    return ((A - marketPrice) / A) * 100;
  }, [A, marketPrice]);

  const saveRescueScenario = (target: { target: number; budget: number; shares: number; newAvg: number }) => {
    if (!marketPrice) return;
    const currentCount = getScenariosForHolding(holding.id).length;
    if (!canSaveScenario(currentCount)) {
      toast({ title: "Scenario limit reached", description: `Free users can save up to ${FREE_SCENARIO_LIMIT} scenarios. Upgrade for unlimited.`, variant: "destructive" });
      return;
    }
    addScenario({
      holding_id: holding.id, ticker: holding.ticker, method: "price_target",
      input1_label: "Buy price", input1_value: marketPrice,
      input2_label: "Target average cost", input2_value: target.target,
      include_fees: true, fee_amount: 0, buy_price: marketPrice, shares_to_buy: target.shares,
      budget_invested: target.budget, fee_applied: 0, total_spend: target.budget,
      new_total_shares: S + target.shares, new_avg_cost: target.newAvg,
      recommended_target: null, budget_percent_used: null,
      notes: `Insight: Average rescue to ${cp}${fmt2(target.target)}`,
    });
    toast({ title: "Scenario saved" });
    onSaved();
  };

  const handleCustomRescue = () => {
    setCustomError("");
    const t = parseFloat(customTarget);
    if (isNaN(t) || t <= 0) { setCustomError("Enter a valid target price."); return; }
    if (marketPrice == null) return;
    if (t >= A) { setCustomError("Target must be below your current average."); return; }
    if (t <= marketPrice) { setCustomError("Target must be above the current price."); return; }
    if (!customRescueResult) { setCustomError("Could not compute — check your inputs."); return; }
    saveRescueScenario({ target: t, ...customRescueResult });
    setCustomTarget("");
  };

  if (marketPrice == null) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/10 p-8 text-center space-y-1.5">
        <Lightbulb className="h-5 w-5 mx-auto text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">Refresh market prices to unlock position insights.</p>
      </div>
    );
  }

  const { score: efficiencyScore, improvement: efficiencyImprovement } = efficiencyData ?? { score: 0, improvement: 0 };
  const band = getEfficiencyBand(efficiencyScore);

  return (
    <div className="space-y-5">

      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">
        For informational purposes only — not financial advice
      </p>

      {/* Average Rescue */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Average Rescue</h3>
        </div>
        <p className="text-[11px] text-muted-foreground mb-4">
          Capital required to lower your average cost at {cp}{fmt2(marketPrice)}/share.
        </p>
        {rescueTargets.length === 0 ? (
          <p className="text-xs text-muted-foreground/70">
            {marketPrice >= A
              ? "Current price is at or above your average — rescue estimates do not apply."
              : "Unable to compute rescue targets."}
          </p>
        ) : (
          <div className="space-y-2.5">
            {rescueTargets.map((t, i) => (
              <div key={t.target} className="rounded-lg border border-border/60 bg-background/50 p-3.5 hover:border-primary/20 transition-colors">
                <div className="flex items-baseline justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{["Modest","Moderate","Ambitious"][i]}</span>
                    <span className="text-base font-bold font-mono">Reach {cp}{fmt2(t.target)}</span>
                  </div>
                  <span className="text-sm font-mono font-semibold text-primary">
                    → invest {cp}{fmt2(t.budget)}
                  </span>
                </div>
                <div className="flex gap-4 text-[11px] font-mono text-muted-foreground mb-2.5">
                  <span>{t.shares.toFixed(2)} shares</span>
                  <span>New avg: {cp}{fmt2(t.newAvg)}</span>
                </div>
                <div className="flex gap-2 pt-2 border-t border-border/30">
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => onUseInCalculator("price_target", String(marketPrice), String(t.target))}>
                    <ArrowRight className="mr-1 h-2.5 w-2.5" /> Use in calculator
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => saveRescueScenario(t)}>
                    <Save className="mr-1 h-2.5 w-2.5" /> Save scenario
                  </Button>
                </div>
              </div>
            ))}

            {/* Custom target */}
            <div className="rounded-lg border border-dashed border-border/60 bg-background/30 p-3.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Custom target</p>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-[10px] text-muted-foreground">Target average ({cp})</Label>
                  <Input type="number" step="0.01" value={customTarget}
                    onChange={(e) => { setCustomTarget(e.target.value); setCustomError(""); }}
                    className="h-8 font-mono text-sm bg-background" />
                </div>
                <Button size="sm" className="h-8 text-xs" onClick={handleCustomRescue}>
                  Calculate
                </Button>
              </div>
              {customTarget && !customError && customRescueResult && (
                <div className="mt-3 rounded-lg border border-border/60 bg-background/50 p-3">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-base font-bold font-mono">Reach {cp}{fmt2(parseFloat(customTarget))}</span>
                    <span className="text-sm font-mono font-semibold text-primary">
                      → invest {cp}{fmt2(customRescueResult.budget)}
                    </span>
                  </div>
                  <div className="flex gap-4 text-[11px] font-mono text-muted-foreground mb-2.5">
                    <span>{customRescueResult.shares.toFixed(2)} shares</span>
                    <span>New avg: {cp}{fmt2(customRescueResult.newAvg)}</span>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border/30">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => onUseInCalculator("price_target", String(marketPrice), customTarget)}>
                      <ArrowRight className="mr-1 h-2.5 w-2.5" /> Use in calculator
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                      onClick={handleCustomRescue}>
                      <Save className="mr-1 h-2.5 w-2.5" /> Save scenario
                    </Button>
                  </div>
                </div>
              )}
              {customError && <p className="text-xs text-destructive mt-2">{customError}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Standardized test score (same fixed amount as documented in Insights) */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Standardized test score</h3>
        </div>
        <p className="text-[10px] text-muted-foreground/80 mb-2 leading-relaxed">
          0–100 from a fixed {cp}
          {fmt2(STANDARD_TEST_INVESTMENT)} simulated buy at the current price: score = round(10,000 × avg
          improvement ÷ your current average), capped at 100. Uses the same “include fees in simulations” setting as the
          Goal Ladder.
        </p>
        <div className="flex items-baseline gap-3 mb-2">
          <span className={`text-4xl font-mono font-bold ${band.colorClass}`}>
            {efficiencyScore}
          </span>
          <span className="text-lg text-muted-foreground font-mono">/ 100</span>
        </div>
        {efficiencyScore > 0 && efficiencyImprovement > 0 && (
          <p className="text-sm font-mono font-semibold text-primary mb-1">
            {cp}
            {fmt2(STANDARD_TEST_INVESTMENT)} simulated → avg moves by {cp}
            {fmt2(efficiencyImprovement)}/share
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {efficiencyScore >= 80
            ? "At this size of simulated buy, your modeled average cost moves a lot relative to your current average."
            : efficiencyScore >= 60
              ? "Meaningful modeled movement in average cost for this test size."
              : efficiencyScore >= 40
                ? "Some modeled movement; larger simulated sizes would show bigger changes."
                : efficiencyScore >= 20
                  ? "Small modeled movement at this test size."
                  : "Price is at or above average, or the modeled move is negligible."}
        </p>
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${efficiencyScore}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-muted-foreground">Low</span>
            <span className={`text-[9px] font-medium ${band.colorClass}`}>
              {band.label}
            </span>
            <span className="text-[9px] text-muted-foreground">High</span>
          </div>
        </div>
      </div>

      {/* Average vs current price (not a full counterfactual entry) */}
      {startTodayDiff != null && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Average vs current price</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Your Avg Cost</p>
              <p className="text-lg font-mono font-bold">{cp}{fmt2(A)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Current Price</p>
              <p className="text-lg font-mono font-bold">{cp}{fmt2(marketPrice)}</p>
            </div>
          </div>
          <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
            {startTodayDiff > 0 ? (
              <p className="text-xs text-muted-foreground">
                Current price is about{" "}
                <span className="font-semibold text-primary">{Math.abs(startTodayDiff).toFixed(1)}%</span> below your
                average cost (as a share of your average). Illustrative only.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Current price is about{" "}
                <span className="font-semibold text-primary">{Math.abs(startTodayDiff).toFixed(1)}%</span> above your
                average cost (as a share of your average). Illustrative only.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
