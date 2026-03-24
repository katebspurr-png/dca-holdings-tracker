import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { PortfolioStrategyProgress } from "@/components/PortfolioStrategyProgress";
import { getHoldings } from "@/lib/storage";
import { Button } from "@/components/ui/button";

export default function Progress() {
  const holdings = getHoldings();

  return (
    <div className="relative min-h-[max(884px,100dvh)] overflow-x-hidden bg-stitch-bg pb-28 font-sans text-white antialiased">
      <header className="mb-8 px-4 pt-12 text-center sm:px-6 md:px-8">
        <div className="mx-auto flex max-w-md flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="h-6 w-6 shrink-0 text-stitch-accent" />
            <h1 className="text-3xl font-bold leading-tight tracking-tight">Progress</h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-md flex-1 flex-col gap-4 px-4 sm:px-6 md:px-8">
        <section className="relative overflow-hidden rounded-[32px] border border-stitch-border bg-stitch-card p-6 shadow-lg">
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-stitch-accent/10 blur-3xl" />
          <div className="relative z-10">
            <p className="text-sm leading-relaxed text-stitch-muted">
              This tab is only for portfolio-wide progress versus the average cost snapshot from when each holding was first
              added. Your main portfolio screen focuses on prices, P/L, and strategy opportunities — open the menu (⋯) there
              for What-If scenarios or this Progress view.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 border-stitch-border bg-stitch-pill text-stitch-muted-soft hover:bg-stitch-card hover:text-white"
              asChild
            >
              <Link to="/">Back to portfolio</Link>
            </Button>
          </div>
        </section>

        {holdings.length === 0 ? (
          <section className="rounded-[32px] border border-dashed border-stitch-border/60 bg-stitch-card/50 p-6 text-center shadow-lg">
            <p className="text-sm text-stitch-muted">No holdings yet — add positions from the portfolio screen.</p>
          </section>
        ) : (
          <PortfolioStrategyProgress holdings={holdings} />
        )}

        {!holdings.some((h) => h.initial_avg_cost > h.avg_cost) && holdings.length > 0 && (
          <p className="px-1 text-center text-xs text-stitch-muted/90">
            No positions currently show a lower average than their initial snapshot. This updates as you record buys that
            reduce average cost.
          </p>
        )}
      </main>
    </div>
  );
}
