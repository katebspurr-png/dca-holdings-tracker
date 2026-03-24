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
    <section>
      <div className="mb-3 flex items-center gap-2">
        <TrendingDown className="h-4 w-4 text-primary" />
        <h2 className="section-label">Strategy progress</h2>
      </div>
      <p className="mb-3 text-[10px] text-muted-foreground/70">
        Compared to the average cost when each position was first tracked in the app.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Positions</p>
          <p
            className="mt-1"
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: "1.25rem",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {improved.length}
          </p>
          <p className="mt-1 text-[9px] text-muted-foreground">Lower avg than initial snapshot</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg reduction / share</p>
          <div className="mt-2 space-y-2">
            {usImproved.length > 0 && (
              <p className="text-primary" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem" }}>
                US ${fmt(avgPerShare(usImproved))}
              </p>
            )}
            {cadImproved.length > 0 && (
              <p className="text-primary" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem" }}>
                CAD C${fmt(avgPerShare(cadImproved))}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:col-span-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total cost basis reduction
          </p>
          <div className="mt-2 space-y-1.5">
            {usImproved.length > 0 && (
              <p className="font-mono text-sm font-semibold text-primary">US ${fmt(totalBasisReduction(usImproved))}</p>
            )}
            {cadImproved.length > 0 && (
              <p className="font-mono text-sm font-semibold text-primary">CAD C${fmt(totalBasisReduction(cadImproved))}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
