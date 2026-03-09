import type { Holding } from "@/lib/storage";

interface Props {
  holding: Holding;
  currencyPrefix: string;
}

const fmt2 = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CostBasisProgress({ holding, currencyPrefix: cp }: Props) {
  const initial = Number(holding.initial_avg_cost);
  const current = Number(holding.avg_cost);

  if (initial <= current) return null;

  const reduction = initial - current;
  const pctImproved = Math.min(((reduction / initial) * 100), 100);
  const costBasisReduction = reduction * Number(holding.shares);

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">

      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Cost Basis Progress
          </h2>
        </div>
        <span className="text-xs font-mono font-semibold text-primary">
          −{pctImproved.toFixed(1)}% avg
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Initial Avg</p>
          <p className="text-base font-mono font-bold mt-0.5">{cp}{fmt2(initial)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Avg</p>
          <p className="text-base font-mono font-bold text-primary mt-0.5">{cp}{fmt2(current)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Saved / Share</p>
          <p className="text-base font-mono font-bold text-primary mt-0.5">{cp}{fmt2(reduction)}</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pctImproved}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-muted-foreground">No improvement</span>
          <span className="text-[9px] font-medium text-primary">{pctImproved.toFixed(1)}% lower avg</span>
          <span className="text-[9px] text-muted-foreground">Initial avg</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Total cost basis reduction
        </span>
        <span className="text-sm font-mono font-bold text-primary">
          {cp}{fmt2(costBasisReduction)}
        </span>
      </div>

    </div>
  );
}
