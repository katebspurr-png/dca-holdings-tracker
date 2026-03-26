import { TrendingDown } from "lucide-react";
import type { Holding } from "@/lib/storage";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Props = { holdings: Holding[] };

/** Portfolio-level summary: positions whose current avg is below the initial snapshot. */
export function PortfolioStrategyProgress({ holdings }: Props) {
  const improved = holdings.filter((h) => h.initial_avg_cost > h.avg_cost);
  if (improved.length === 0) return null;

  const usImproved = improved.filter((h) => (h.exchange ?? "US") === "US");
  const cadImproved = improved.filter((h) => (h.exchange ?? "US") === "TSX");

  const avgPerShare = (list: Holding[]) =>
    list.reduce((sum, h) => sum + (h.initial_avg_cost - h.avg_cost), 0) / list.length;

  const totalBasisReduction = (list: Holding[]) =>
    list.reduce((sum, h) => sum + (h.initial_avg_cost - h.avg_cost) * h.shares, 0);

  return (
    <section className="card-primary rounded-[32px] p-6">
      <div className="card-primary-glow" aria-hidden />
      <div className="relative z-10">
        <div className="mb-3 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 shrink-0 text-stitch-accent" />
          <h2 className="text-[17px] font-semibold text-foreground">Progress vs initial snapshot</h2>
        </div>
        <p className="mb-3 text-[10px] leading-relaxed text-stitch-muted">
          Same metrics as the Progress tab: current average cost versus the value when each position was first tracked here
          (not buy/sell advice).
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="card-secondary bg-stitch-pill/30 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stitch-muted">Positions</p>
            <p className="mt-1 text-[22px] font-bold leading-none text-foreground">{improved.length}</p>
            <p className="mt-1 text-[9px] text-stitch-muted">Lower avg than initial snapshot</p>
          </div>

          <div className="card-secondary bg-stitch-pill/30 p-4 sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stitch-muted">Avg reduction / share</p>
            <div className="mt-2 space-y-2">
              {usImproved.length > 0 && (
                <p className="text-lg font-bold text-stitch-accent">US ${fmt(avgPerShare(usImproved))}</p>
              )}
              {cadImproved.length > 0 && (
                <p className="text-lg font-bold text-stitch-accent">CAD C${fmt(avgPerShare(cadImproved))}</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-stitch-border/60 bg-stitch-pill/30 p-4 sm:col-span-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stitch-muted">
              Total cost basis reduction
            </p>
            <div className="mt-2 space-y-1.5">
              {usImproved.length > 0 && (
                <p className="font-mono text-sm font-semibold text-stitch-accent">
                  US ${fmt(totalBasisReduction(usImproved))}
                </p>
              )}
              {cadImproved.length > 0 && (
                <p className="font-mono text-sm font-semibold text-stitch-accent">
                  CAD C${fmt(totalBasisReduction(cadImproved))}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
