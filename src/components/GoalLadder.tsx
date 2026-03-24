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
      <div className="rounded-xl border border-[#34d399]/20 bg-background/80 p-5 font-mono text-sm text-muted-foreground">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#34d399] mb-2 flex items-center gap-2">
          <TrendingDown className="h-4 w-4" />
          Goal Ladder
        </h2>
        <p>
          Add a current market price from the Overview tab or{" "}
          <button
            type="button"
            onClick={() => navigate("/update-prices")}
            className="text-[#34d399] underline underline-offset-2 hover:opacity-90"
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
        <div className="rounded-xl border border-[#34d399]/20 bg-background/80 p-5 font-mono text-sm">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#34d399] mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Goal Ladder
          </h2>
          <p className="text-muted-foreground">
            Current price is at or above your average — ladder simulations apply when price is below average.
          </p>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[#34d399]/30 bg-card/40 px-4 py-3 font-mono text-sm">
          <Label htmlFor="goal-ladder-fees" className="text-[11px] text-muted-foreground cursor-pointer">
            Include fees in ladder math
          </Label>
          <Switch id="goal-ladder-fees" checked={includeFees} onCheckedChange={setIncludeFees} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-xl border border-[#34d399]/20 bg-background/80 px-4 py-3 font-mono text-sm">
        <Label htmlFor="goal-ladder-fees-active" className="text-[11px] text-muted-foreground cursor-pointer">
          Include fees in ladder math
        </Label>
        <Switch id="goal-ladder-fees-active" checked={includeFees} onCheckedChange={setIncludeFees} />
      </div>

      <div className="rounded-xl border border-[#34d399]/20 bg-background/80 p-5 font-mono text-sm">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#34d399] mb-1 flex items-center gap-2">
          <TrendingDown className="h-4 w-4" />
          Goal Ladder
        </h2>
        <p className="text-[11px] text-muted-foreground/80 mb-4">
          Simulated buys at {cp}
          {fmt(currentPrice)}/share (illustrative only; not a forecast or instruction).
        </p>
        <p className="text-[10px] text-muted-foreground/60 mb-3">
          Steps: {LADDER_INVESTMENT_STEPS.map((n) => `${cp}${n}`).join(" · ")} — outcomes if each full amount were deployed at the current price.
        </p>
        <ul className="space-y-3">
          {ladderRows.map(({ amount, newAvg, avgImprovement }) => (
            <li
              key={amount}
              className="border-b border-border/40 pb-3 last:border-0 last:pb-0 text-foreground/90 leading-relaxed"
            >
              Invest {cp}
              {fmt(amount)} → Avg becomes {cp}
              {fmt(newAvg)} · Saves {cp}
              {fmt(avgImprovement)}/share
            </li>
          ))}
        </ul>
      </div>

      {efficientStep && (
        <div className="rounded-xl border border-[#34d399]/30 bg-card/40 p-5 font-mono text-sm card-glow">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#34d399] mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Most efficient step (from ladder)
          </h3>
          <p className="text-[10px] text-muted-foreground/70 mb-3">
            Selected from the ladder by improvement per dollar, skipping tiny impact and very large steps vs. position size.
          </p>
          <div className="text-foreground/90 space-y-1.5 leading-relaxed">
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
