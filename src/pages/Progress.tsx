import { Link } from "react-router-dom";
import { PortfolioStrategyProgress } from "@/components/PortfolioStrategyProgress";
import { getHoldings } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { useStorageRevision } from "@/hooks/use-storage-revision";

export default function Progress() {
  useStorageRevision();
  const holdings = getHoldings();

  return (
    <div className="relative min-h-[max(884px,100dvh)] overflow-x-hidden bg-stitch-bg pb-28 font-sans text-foreground antialiased">
      <main className="relative z-10 mx-auto flex max-w-md flex-1 flex-col gap-5 px-4 pt-12 sm:px-6 md:px-8">
        <section className="card-primary rounded-[32px] p-6">
          <div className="card-primary-glow" aria-hidden />
          <div className="relative z-10">
            <p className="text-sm leading-relaxed text-stitch-muted">
              This tab is only for portfolio-wide progress versus the average cost snapshot from when each holding was first
              added. Your main portfolio screen focuses on prices, P/L, and per-holding scenario results — open the menu
              (⋯) there for What-If scenarios or this Progress view.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 border-stitch-border bg-stitch-pill text-stitch-muted-soft transition-interactive hover:bg-stitch-card hover:text-foreground"
              asChild
            >
              <Link to="/">Back to portfolio</Link>
            </Button>
          </div>
        </section>

        {holdings.length === 0 ? (
          <section className="card-secondary rounded-[32px] border-dashed border-stitch-border/50 bg-stitch-pill/10 p-6 text-center">
            <p className="text-sm leading-relaxed text-stitch-muted">
              No holdings yet — add positions from the portfolio screen.
            </p>
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
