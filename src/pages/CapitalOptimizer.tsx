import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Zap, Target, BarChart3, DollarSign } from "lucide-react";
import WaitlistForm from "@/components/WaitlistForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getHoldings, currencyPrefix } from "@/lib/storage";
import { getCachedPrice } from "@/lib/price-cache";
import { useSimFees } from "@/contexts/SimFeesContext";
import { greedyAllocateBudget } from "@/lib/dca-sim";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CapitalOptimizer() {
  const holdings = getHoldings();
  const { includeFees, setIncludeFees } = useSimFees();
  const [budgetInput, setBudgetInput] = useState("2000");
  const [tick, setTick] = useState(0);
  const [lastRun, setLastRun] = useState<ReturnType<typeof greedyAllocateBudget> | null>(null);

  const livePrices = useMemo(() => {
    void tick;
    const prices: Record<string, number | null> = {};
    for (const h of holdings) {
      prices[h.id] = getCachedPrice(h.ticker, h.exchange);
    }
    return prices;
  }, [holdings, tick]);

  const hasMixedCurrency =
    holdings.some((h) => h.exchange === "US") && holdings.some((h) => h.exchange === "TSX");

  const runModel = () => {
    const budget = parseFloat(budgetInput);
    if (!Number.isFinite(budget) || budget <= 0) {
      setLastRun(null);
      return;
    }
    setLastRun(greedyAllocateBudget(holdings, livePrices, budget, includeFees, { chunk: 100 }));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 800,
                  fontSize: "1.25rem",
                  letterSpacing: "-0.02em",
                }}
              >
                Capital Planner
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Chunked greedy simulation — illustrative, not prescriptive
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-8 space-y-8">
        <section className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter a single budget. The model assigns $100 chunks to whichever underwater holding shows the highest
            modeled average improvement per dollar at that moment, then repeats until the budget is used or no eligible
            holding remains.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: DollarSign, label: "Enter your budget" },
              { icon: Target, label: "Uses cached prices" },
              { icon: BarChart3, label: "Review modeled split" },
              { icon: Zap, label: "Outcomes only" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3"
              >
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-medium">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="planner-budget" className="text-xs">
                Budget (numeric — same units as your position currencies)
              </Label>
              <Input
                id="planner-budget"
                type="number"
                min={0}
                step={100}
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="font-mono"
              />
            </div>
            <Button type="button" className="shrink-0" onClick={runModel}>
              Model allocation
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
            <Label htmlFor="planner-sim-fees" className="cursor-pointer text-xs text-muted-foreground">
              Include fees in simulation
            </Label>
            <Switch id="planner-sim-fees" checked={includeFees} onCheckedChange={setIncludeFees} />
          </div>

          <p className="text-[10px] text-muted-foreground">
            <Link to="/update-prices" className="text-primary underline underline-offset-2">
              Refresh prices
            </Link>{" "}
            first if results look empty.{" "}
            <button
              type="button"
              className="text-primary underline underline-offset-2"
              onClick={() => setTick((t) => t + 1)}
            >
              Reload cache
            </button>
          </p>

          {hasMixedCurrency && (
            <p className="text-[10px] text-amber-600/90 dark:text-amber-500/90">
              You hold both US and TSX positions. One budget number mixes currencies without FX — treat totals as
              notional, not a single real-world bank balance.
            </p>
          )}

          {lastRun && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Modeled allocation</span>
                <span className="text-xs font-mono text-primary font-semibold">
                  Used {fmt(lastRun.usedBudget)} · Unallocated {fmt(lastRun.remainingBudget)}
                </span>
              </div>
              {lastRun.lines.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No modeled deploys — need underwater positions (price below avg) and cached quotes for them.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {lastRun.lines.map((line, i) => {
                    const cp = currencyPrefix(line.exchange);
                    return (
                      <div key={line.holdingId} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-[10px] text-muted-foreground/40 font-mono w-4 shrink-0">{i + 1}</span>
                          <span className="text-sm font-bold font-mono truncate">{line.ticker}</span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 text-right">
                          <div>
                            <p className="text-xs font-mono font-semibold">
                              {cp}
                              {fmt(line.allocated)}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">deploy</p>
                          </div>
                          <div>
                            <p className="text-xs font-mono">{cp}{fmt(line.newAvg)}</p>
                            <p className="text-[10px] text-primary font-mono font-semibold">
                              −{cp}
                              {fmt(line.avgImprovementVsInitial)}/sh vs start
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="px-4 py-3 bg-primary/5 border-t border-border">
                <p className="text-[11px] text-center text-muted-foreground">
                  Heuristic simulation only — not financial advice or an optimal portfolio solution.
                </p>
              </div>
            </div>
          )}
        </section>

        <div className="border-t border-border" />

        <section>
          <div className="mb-5">
            <h2
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: "1.1rem",
                letterSpacing: "-0.02em",
              }}
            >
              Get early access
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tell us what you want next for planner-style tools and we will follow up.
            </p>
          </div>
          <WaitlistForm defaultFeature="optimizer" />
        </section>
      </main>
    </div>
  );
}
