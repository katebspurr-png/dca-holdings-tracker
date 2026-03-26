import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingDown, Zap } from "lucide-react";
import { type Holding, apiTicker, currencyPrefix } from "@/lib/storage";
import { getCachedQuote } from "@/lib/stock-price";
import { useSimFees } from "@/contexts/SimFeesContext";
import {
  LADDER_INVESTMENT_STEPS,
  buildLadderRows,
  selectMostEfficientLadderStep,
  holdingFeeOpts,
} from "@/lib/dca-sim";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  holding: Holding;
}

/**
 * Plan tab: renders sections only (parent supplies card-primary + divide-y).
 * Borders are minimal; separation uses dividers + soft pill backgrounds.
 */
export default function GoalLadder({ holding }: Props) {
  const navigate = useNavigate();
  const { includeFees, setIncludeFees } = useSimFees();
  const cp = currencyPrefix(holding.exchange ?? "US");
  const S = holding.shares;
  const A = holding.avg_cost;
  const feeOpts = holdingFeeOpts(holding, includeFees);

  const currentPrice = useMemo(() => {
    const key = apiTicker(holding.ticker, holding.exchange ?? "US").toUpperCase();
    const q = getCachedQuote(key);
    return q?.price ?? null;
  }, [holding.ticker, holding.exchange]);

  const underwater = currentPrice != null && currentPrice < A;

  const ladderRows = useMemo(() => {
    if (currentPrice == null || !underwater) return [];
    return buildLadderRows(S, A, currentPrice, feeOpts);
  }, [S, A, currentPrice, underwater, feeOpts.includeFees, feeOpts.feeType, feeOpts.feeValue]);

  const efficientStep = useMemo(() => {
    if (currentPrice == null || !underwater) return null;
    return selectMostEfficientLadderStep(S, A, currentPrice, feeOpts);
  }, [S, A, currentPrice, underwater, feeOpts.includeFees, feeOpts.feeType, feeOpts.feeValue]);

  if (currentPrice == null) {
    return (
      <section className="p-5 sm:p-6">
        <h2 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-stitch-muted">
          <TrendingDown className="h-4 w-4 shrink-0 text-stitch-accent/90" aria-hidden />
          Modeled buy levels
        </h2>
        <p className="text-xs text-stitch-muted leading-relaxed">
          Add a market price from Overview or{" "}
            <button
            type="button"
            onClick={() => navigate("/update-prices")}
            className="transition-interactive text-stitch-accent/90 underline underline-offset-2 hover:text-stitch-accent"
          >
            Update Prices
          </button>{" "}
          to see fixed-rung simulations.
        </p>
      </section>
    );
  }

  if (!underwater) {
    return (
      <>
        <section className="stitch-toggle-row-subtle flex items-center justify-between px-5 py-3.5 sm:px-6 bg-stitch-pill/10">
          <Label htmlFor="goal-ladder-fees" className="cursor-pointer text-[11px] text-stitch-muted">
            Include fees in ladder math
          </Label>
          <Switch id="goal-ladder-fees" checked={includeFees} onCheckedChange={setIncludeFees} />
        </section>
        <section className="p-5 sm:p-6">
          <h2 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-stitch-muted">
            <TrendingDown className="h-4 w-4 shrink-0 text-stitch-accent/90" aria-hidden />
            Modeled buy levels
          </h2>
          <p className="text-xs text-stitch-muted leading-relaxed">
            Price is at or above your average — these rungs only apply when price is below average.
          </p>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="stitch-toggle-row-subtle flex items-center justify-between px-5 py-3.5 sm:px-6 bg-stitch-pill/10">
        <Label htmlFor="goal-ladder-fees-active" className="cursor-pointer text-[11px] text-stitch-muted">
          Include fees in ladder math
        </Label>
        <Switch id="goal-ladder-fees-active" checked={includeFees} onCheckedChange={setIncludeFees} />
      </section>

      <section className="p-5 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-stitch-muted">
          <TrendingDown className="h-4 w-4 shrink-0 text-stitch-accent/90" aria-hidden />
          Modeled buy levels
        </h2>
        <p className="mb-4 text-[11px] text-stitch-muted/90 leading-relaxed">
          Preset amounts at {cp}
          {fmt(currentPrice)}/share — illustrative only.
        </p>
        <p className="mb-3 text-[10px] text-stitch-muted/60 font-mono">
          Rungs: {LADDER_INVESTMENT_STEPS.map((n) => `${cp}${n}`).join(" · ")}
        </p>
        <div className="overflow-hidden rounded-xl bg-stitch-pill/15">
          <ul className="divide-y divide-stitch-border/20">
            {ladderRows.map(({ amount, newAvg, avgImprovement }) => (
              <li key={amount} className="px-4 py-3.5 text-sm font-mono text-foreground/90 leading-snug">
                Invest {cp}
                {fmt(amount)} → Modeled avg {cp}
                {fmt(newAvg)} · Avg change {cp}
                {fmt(avgImprovement)}/share
              </li>
            ))}
          </ul>
        </div>

        {efficientStep && (
          <div className="mt-5 rounded-xl bg-stitch-pill/20 px-4 py-4">
            <h3 className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-stitch-muted">
              <Zap className="h-3.5 w-3.5 text-stitch-accent/90" aria-hidden />
              Illustrative rung
            </h3>
            <p className="mb-3 text-[10px] text-stitch-muted/80 leading-relaxed">
              Picked from the rungs above by modeled improvement per dollar (filters tiny impact and oversized steps).
            </p>
            <div className="space-y-1.5 text-sm font-mono text-foreground/90">
              <p>
                Deploy {cp}
                {fmt(efficientStep.amount)}
              </p>
              <p>
                Modeled avg {cp}
                {fmt(efficientStep.newAvg)}
              </p>
              <p className="text-stitch-accent/95">
                Avg moves by {cp}
                {fmt(efficientStep.avgImprovement)}/share
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
