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
      <div className="rounded-2xl border border-stitch-accent/25 bg-stitch-pill/40 p-5 font-mono text-sm text-stitch-muted">
        <h2 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-stitch-accent">
          <TrendingDown className="h-4 w-4" />
          Budget-step simulator
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

  if (!underwater) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-stitch-accent/25 bg-stitch-pill/40 p-5 font-mono text-sm">
          <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-stitch-accent">
            <TrendingDown className="h-4 w-4" />
            Budget-step simulator
          </h2>
          <p className="text-stitch-muted">
            Current price is at or above your average — these fixed-rung simulations only apply when price is below
            average (modeled average-cost reduction).
          </p>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-stitch-border/60 bg-stitch-pill/30 px-4 py-3 font-mono text-sm">
          <Label htmlFor="goal-ladder-fees" className="cursor-pointer text-[11px] text-stitch-muted">
            Include fees in ladder math
          </Label>
          <Switch id="goal-ladder-fees" checked={includeFees} onCheckedChange={setIncludeFees} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-2xl border border-stitch-accent/25 bg-stitch-pill/40 px-4 py-3 font-mono text-sm">
        <Label htmlFor="goal-ladder-fees-active" className="cursor-pointer text-[11px] text-stitch-muted">
          Include fees in ladder math
        </Label>
        <Switch id="goal-ladder-fees-active" checked={includeFees} onCheckedChange={setIncludeFees} />
      </div>

      <div className="rounded-2xl border border-stitch-accent/25 bg-stitch-pill/40 p-5 font-mono text-sm">
        <h2 className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-stitch-accent">
          <TrendingDown className="h-4 w-4" />
          Budget-step simulator
        </h2>
        <p className="mb-4 text-[11px] text-stitch-muted/90">
          Uses preset dollar amounts (not custom “goals” yet). Simulated buys at {cp}
          {fmt(currentPrice)}/share — illustrative only; not a forecast or instruction.
        </p>
        <p className="mb-3 text-[10px] text-stitch-muted/70">
          Rungs: {LADDER_INVESTMENT_STEPS.map((n) => `${cp}${n}`).join(" · ")} — modeled outcome if each full amount were
          deployed at the current price.
        </p>
        <ul className="space-y-3">
          {ladderRows.map(({ amount, newAvg, avgImprovement }) => (
            <li
              key={amount}
              className="border-b border-stitch-border/40 pb-3 text-white/90 last:border-0 last:pb-0 leading-relaxed"
            >
              Invest {cp}
              {fmt(amount)} → Avg becomes {cp}
              {fmt(newAvg)} · Avg change {cp}
              {fmt(avgImprovement)}/share
            </li>
          ))}
        </ul>
      </div>

      {efficientStep && (
        <div className="rounded-2xl border border-stitch-border/60 bg-stitch-pill/30 p-5 font-mono text-sm">
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-stitch-accent">
            <Zap className="h-4 w-4" />
            Illustrative rung (same ladder math)
          </h3>
          <p className="mb-3 text-[10px] text-stitch-muted/80">
            One rung chosen by modeled improvement per dollar among the fixed amounts above, skipping tiny impact and very
            large steps vs. position size — for your review, not a trade instruction.
          </p>
          <div className="space-y-1.5 text-white/90 leading-relaxed">
            <p>
              Simulated deploy {cp}
              {fmt(efficientStep.amount)}
            </p>
            <p>
              Avg becomes {cp}
              {fmt(efficientStep.newAvg)}
            </p>
            <p>
              Avg moves by {cp}
              {fmt(efficientStep.avgImprovement)}/share
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
