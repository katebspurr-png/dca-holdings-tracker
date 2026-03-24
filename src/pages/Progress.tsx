import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { PortfolioStrategyProgress } from "@/components/PortfolioStrategyProgress";
import { getHoldings } from "@/lib/storage";
import { Button } from "@/components/ui/button";

export default function Progress() {
  const holdings = getHoldings();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center px-6 py-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#34d399]" />
            <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">Progress</h1>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-6 py-8 space-y-8">
        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
          Track how modeled averages compare to the snapshot taken when each position was first added. For live prices
          and allocation ideas, use the portfolio tab.
        </p>
        <Button variant="outline" size="sm" className="font-mono text-xs" asChild>
          <Link to="/">Back to portfolio</Link>
        </Button>

        {holdings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No holdings yet — add positions from the portfolio screen.</p>
        ) : (
          <PortfolioStrategyProgress holdings={holdings} />
        )}

        {!holdings.some((h) => h.initial_avg_cost > h.avg_cost) && holdings.length > 0 && (
          <p className="text-xs text-muted-foreground/80">
            No positions currently show a lower average than their initial snapshot. This updates as you record buys that
            reduce average cost.
          </p>
        )}
      </main>
    </div>
  );
}
