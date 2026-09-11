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
    <section
      aria-labelledby="portfolio-strategy-title"
      className="relative overflow-hidden rounded-[32px] border border-stitch-border bg-stitch-card p-6 shadow-lg"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-stitch-accent/10 blur-3xl" />
      <div className="relative z-10">
        <div className="mb-3 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 shrink-0 text-stitch-accent" aria-hidden="true" />
          <h2 id="portfolio-strategy-title" className="text-[17px] font-semibold text-white">
            Progress vs initial snapshot
          </h2>
        </div>
        <p className="mb-3 text-[10px] leading-relaxed text-stitch-muted">
          Same metrics as the Progress tab: current average cost versus the value when each position was first tracked here
          (not buy/sell advice).
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-stitch-border/60 bg-stitch-pill/30 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stitch-muted">Positions</p>
            <p className="mt-1 text-[22px] font-bold leading-none text-white">{improved.length}</p>
            <p className="mt-1 text-[9px] text-stitch-muted">Lower avg than initial snapshot</p>
          </div>

          <div className="rounded-2xl border border-stitch-border/60 bg-stitch-pill/30 p-4 sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stitch-muted">Avg reduction / share</p>
            <div className="mt-2 space-y-2">
              {usImproved.length > 0 && (
                <p className="text-lg font-bold text-stitch-accent">
                  <span className="sr-only">US dollar average reduction per share: ${fmt(avgPerShare(usImproved))}</span>
                  <span aria-hidden="true">US ${fmt(avgPerShare(usImproved))}</span>
                </p>
              )}
              {cadImproved.length > 0 && (
                <p className="text-lg font-bold text-stitch-accent">
                  <span className="sr-only">
                    Canadian dollar average reduction per share: C${fmt(avgPerShare(cadImproved))}
                  </span>
                  <span aria-hidden="true">CAD C${fmt(avgPerShare(cadImproved))}</span>
                </p>
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
                  <span className="sr-only">
                    US dollar total cost basis reduction: ${fmt(totalBasisReduction(usImproved))}
                  </span>
                  <span aria-hidden="true">US ${fmt(totalBasisReduction(usImproved))}</span>
                </p>
              )}
              {cadImproved.length > 0 && (
                <p className="font-mono text-sm font-semibold text-stitch-accent">
                  <span className="sr-only">
                    Canadian dollar total cost basis reduction: C${fmt(totalBasisReduction(cadImproved))}
                  </span>
                  <span aria-hidden="true">CAD C${fmt(totalBasisReduction(cadImproved))}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
