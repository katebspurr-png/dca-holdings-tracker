import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingDown, Zap } from "lucide-react";
import { type Holding, apiTicker, currencyPrefix } from "@/lib/storage";
import { getCachedQuote } from "@/lib/stock-price";

const INVESTMENT_STEPS = [250, 500, 1000, 2500] as const;
const NEXT_BEST_AMOUNT = 500;

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function computeDcaRow(
  shares: number,
  avgCost: number,
  currentPrice: number,
  investment: number
): { sharesBought: number; newAvg: number; avgImprovement: number } | null {
  if (currentPrice <= 0 || investment <= 0) return null;
  const sharesBought = investment / currentPrice;
  const newAvg = (shares * avgCost + investment) / (shares + sharesBought);
  const avgImprovement = avgCost - newAvg;
  return { sharesBought, newAvg, avgImprovement };
}

interface Props {
  holding: Holding;
}

export default function GoalLadder({ holding }: Props) {
  const navigate = useNavigate();
  const cp = currencyPrefix(holding.exchange ?? "US");
  const S = holding.shares;
  const A = holding.avg_cost;

  const currentPrice = useMemo(() => {
    const key = apiTicker(holding.ticker, holding.exchange ?? "US").toUpperCase();
    const q = getCachedQuote(key);
    return q?.price ?? null;
  }, [holding.ticker, holding.exchange]);

  const underwater = currentPrice != null && currentPrice < A;

  const ladderRows = useMemo(() => {
    if (currentPrice == null || !underwater) return [];
    return INVESTMENT_STEPS.map((amount) => {
      const row = computeDcaRow(S, A, currentPrice, amount);
      return row ? { amount, ...row } : null;
    }).filter(Boolean) as Array<{
      amount: number;
      sharesBought: number;
      newAvg: number;
      avgImprovement: number;
    }>;
  }, [S, A, currentPrice, underwater]);

  const nextBest = useMemo(() => {
    if (currentPrice == null || !underwater) return null;
    return computeDcaRow(S, A, currentPrice, NEXT_BEST_AMOUNT);
  }, [S, A, currentPrice, underwater]);

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
            Position is above water — no averaging needed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#34d399]/20 bg-background/80 p-5 font-mono text-sm">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#34d399] mb-1 flex items-center gap-2">
          <TrendingDown className="h-4 w-4" />
          Goal Ladder
        </h2>
        <p className="text-[11px] text-muted-foreground/80 mb-4">
          Simulated buys at {cp}
          {fmt(currentPrice)}/share (analytical only).
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

      {nextBest && (
        <div className="rounded-xl border border-[#34d399]/30 bg-card/40 p-5 font-mono text-sm card-glow">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[#34d399] mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Next Best Move
          </h3>
          <p className="text-foreground/90 leading-relaxed">
            Invest {cp}
            {fmt(NEXT_BEST_AMOUNT)} → Avg becomes {cp}
            {fmt(nextBest.newAvg)} · Improves by {cp}
            {fmt(nextBest.avgImprovement)}/share
          </p>
        </div>
      )}
    </div>
  );
}
