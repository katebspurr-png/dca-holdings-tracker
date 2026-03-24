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
import { usePreAuthSaveUpsell } from "@/hooks/use-pre-auth-save-upsell";
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
    if (den === 0) return null;
    // Same convention as HoldingDetail `price_target`: B(1+r−T/P)=S(T−A) → B=S(T−A)/(1+r−T/P)
    B = (S * (targetAvg - A)) / den;
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
  if (score >= 80) return { label: "Large modeled avg move", colorClass: "text-stitch-accent" };
  if (score >= 60) return { label: "Meaningful modeled move", colorClass: "text-stitch-accent" };
  if (score >= 40) return { label: "Moderate modeled move", colorClass: "text-stitch-muted" };
  if (score >= 20) return { label: "Small modeled move", colorClass: "text-stitch-muted" };
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
  const { requestPersist, preAuthUpsellDialog } = usePreAuthSaveUpsell();
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
      toast({ title: "Scenario limit reached", description: `Free tier allows up to ${FREE_SCENARIO_LIMIT} saved scenarios. Enable premium preview in Settings for unlimited.`, variant: "destructive" });
      return;
    }
    const B = target.budget;
    const sharesAfter = S + target.shares;
    // Total dollars added to cost basis = B + fee; derive from the same newAvg the solver used (avoids
    // recomputing fee from B in a way that can drift from the target-average math).
    const totalSpend = target.newAvg * sharesAfter - S * A;
    const feeApplied = totalSpend - B;
    requestPersist(() => {
      addScenario({
        holding_id: holding.id, ticker: holding.ticker, method: "price_target",
        input1_label: "Buy price", input1_value: marketPrice,
        input2_label: "Target average cost", input2_value: target.target,
        include_fees: true, fee_amount: feeApplied, buy_price: marketPrice, shares_to_buy: target.shares,
        budget_invested: B, fee_applied: feeApplied, total_spend: totalSpend,
        new_total_shares: S + target.shares, new_avg_cost: target.newAvg,
        recommended_target: null, budget_percent_used: null,
        notes: `Insight: Average rescue to ${cp}${fmt2(target.target)}`,
      });
      toast({ title: "Scenario saved" });
      onSaved();
    });
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
      <div className="rounded-xl border border-dashed border-stitch-border bg-stitch-pill/10 p-8 text-center space-y-1.5">
        <Lightbulb className="h-5 w-5 mx-auto text-stitch-muted/50" />
        <p className="text-xs text-stitch-muted">Refresh market prices to unlock position math (Insights).</p>
      </div>
    );
  }

  const { score: efficiencyScore, improvement: efficiencyImprovement } = efficiencyData ?? { score: 0, improvement: 0 };
  const band = getEfficiencyBand(efficiencyScore);

  return (
    <>
    <div className="space-y-5">

      <p className="text-[10px] text-stitch-muted/60 uppercase tracking-widest">
        For informational purposes only — not financial advice
      </p>

      {/* Modeled capital to reach example target averages */}
      <div className="rounded-xl border border-stitch-border bg-stitch-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="h-4 w-4 text-stitch-accent" />
          <h3 className="text-sm font-semibold text-white">Target average — modeled capital</h3>
        </div>
        <p className="text-[11px] text-stitch-muted mb-4">
          Illustrative budgets if you bought at {cp}
          {fmt2(marketPrice)}/share to reach the sample target averages below — you choose whether any target is relevant.
        </p>
        {rescueTargets.length === 0 ? (
          <p className="text-xs text-stitch-muted/70">
            {marketPrice >= A
              ? "Current price is at or above your average — these target-average estimates do not apply."
              : "Unable to compute targets from current inputs."}
          </p>
        ) : (
          <div className="space-y-2.5">
            {rescueTargets.map((t, i) => (
              <div key={t.target} className="rounded-lg border border-stitch-border/60 bg-stitch-pill/50 p-3.5 hover:border-stitch-accent/20 transition-colors">
                <div className="flex items-baseline justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stitch-muted uppercase tracking-wider">{["Sample A","Sample B","Sample C"][i]}</span>
                    <span className="text-base font-bold font-mono">Target avg {cp}{fmt2(t.target)}</span>
                  </div>
                  <span className="text-sm font-mono font-semibold text-stitch-accent">
                    Modeled ~{cp}{fmt2(t.budget)}
                  </span>
                </div>
                <div className="flex gap-4 text-[11px] font-mono text-stitch-muted mb-2.5">
                  <span>{t.shares.toFixed(2)} shares</span>
                  <span>New avg: {cp}{fmt2(t.newAvg)}</span>
                </div>
                <div className="flex gap-2 pt-2 border-t border-stitch-border/30">
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-stitch-muted hover:text-white"
                    onClick={() => onUseInCalculator("price_target", String(marketPrice), String(t.target))}>
                    <ArrowRight className="mr-1 h-2.5 w-2.5" /> Use in calculator
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-stitch-muted hover:text-white"
                    onClick={() => saveRescueScenario(t)}>
                    <Save className="mr-1 h-2.5 w-2.5" /> Save scenario
                  </Button>
                </div>
              </div>
            ))}

            {/* Custom target */}
            <div className="rounded-lg border border-dashed border-stitch-border/60 bg-stitch-pill/30 p-3.5">
              <p className="text-[10px] text-stitch-muted uppercase tracking-wider mb-2">Your target average</p>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-[10px] text-stitch-muted">Target average ({cp})</Label>
                  <Input type="number" step="0.01" value={customTarget}
                    onChange={(e) => { setCustomTarget(e.target.value); setCustomError(""); }}
                    className="h-8 font-mono text-sm bg-stitch-pill" />
                </div>
                <Button
                  size="sm"
                  className="h-8 bg-stitch-accent text-xs font-semibold text-black hover:bg-stitch-accent/90"
                  onClick={handleCustomRescue}
                >
                  Calculate
                </Button>
              </div>
              {customTarget && !customError && customRescueResult && (
                <div className="mt-3 rounded-lg border border-stitch-border/60 bg-stitch-pill/50 p-3">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-base font-bold font-mono">Target avg {cp}{fmt2(parseFloat(customTarget))}</span>
                    <span className="text-sm font-mono font-semibold text-stitch-accent">
                      Modeled ~{cp}{fmt2(customRescueResult.budget)}
                    </span>
                  </div>
                  <div className="flex gap-4 text-[11px] font-mono text-stitch-muted mb-2.5">
                    <span>{customRescueResult.shares.toFixed(2)} shares</span>
                    <span>New avg: {cp}{fmt2(customRescueResult.newAvg)}</span>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-stitch-border/30">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-stitch-muted hover:text-white"
                      onClick={() => onUseInCalculator("price_target", String(marketPrice), customTarget)}>
                      <ArrowRight className="mr-1 h-2.5 w-2.5" /> Use in calculator
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-stitch-muted hover:text-white"
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
      <div className="rounded-xl border border-stitch-border bg-stitch-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="h-4 w-4 text-stitch-accent" />
          <h3 className="text-sm font-semibold text-white">Fixed-size test score</h3>
        </div>
        <p className="text-[10px] text-stitch-muted/80 mb-2 leading-relaxed">
          0–100 from one fixed {cp}
          {fmt2(STANDARD_TEST_INVESTMENT)} simulated buy at the current price: score = round(10,000 × modeled avg
          improvement ÷ your current average), capped at 100. Different from the portfolio list’s relative 0–100. Uses the
          same “include fees in simulations” setting as the budget-step simulator.
        </p>
        <div className="flex items-baseline gap-3 mb-2">
          <span className={`text-4xl font-mono font-bold ${band.colorClass}`}>
            {efficiencyScore}
          </span>
          <span className="text-lg text-stitch-muted font-mono">/ 100</span>
        </div>
        {efficiencyScore > 0 && efficiencyImprovement > 0 && (
          <p className="text-sm font-mono font-semibold text-stitch-accent mb-1">
            {cp}
            {fmt2(STANDARD_TEST_INVESTMENT)} simulated → avg moves by {cp}
            {fmt2(efficiencyImprovement)}/share
          </p>
        )}
        <p className="text-xs text-stitch-muted">
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
        <div className="mt-3 pt-3 border-t border-stitch-border">
          <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-stitch-pill">
            <div
              className="h-full rounded-full bg-stitch-accent transition-all"
              style={{ width: `${efficiencyScore}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-stitch-muted">Low</span>
            <span className={`text-[9px] font-medium ${band.colorClass}`}>
              {band.label}
            </span>
            <span className="text-[9px] text-stitch-muted">High</span>
          </div>
        </div>
      </div>

      {/* Average vs current price (not a full counterfactual entry) */}
      {startTodayDiff != null && (
        <div className="rounded-xl border border-stitch-border bg-stitch-card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-stitch-accent" />
            <h3 className="text-sm font-semibold text-white">Average vs current price</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-stitch-muted mb-0.5">Your Avg Cost</p>
              <p className="text-lg font-mono font-bold">{cp}{fmt2(A)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-stitch-muted mb-0.5">Current Price</p>
              <p className="text-lg font-mono font-bold">{cp}{fmt2(marketPrice)}</p>
            </div>
          </div>
          <div className="rounded-lg bg-stitch-pill/30 border border-stitch-border/50 p-3">
            {startTodayDiff > 0 ? (
              <p className="text-xs text-stitch-muted">
                Current price is about{" "}
                <span className="font-semibold text-stitch-accent">{Math.abs(startTodayDiff).toFixed(1)}%</span> below your
                average cost (as a share of your average). Illustrative only.
              </p>
            ) : (
              <p className="text-xs text-stitch-muted">
                Current price is about{" "}
                <span className="font-semibold text-stitch-accent">{Math.abs(startTodayDiff).toFixed(1)}%</span> above your
                average cost (as a share of your average). Illustrative only.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
    {preAuthUpsellDialog}
    </>
  );
}
