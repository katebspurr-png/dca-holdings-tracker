import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Zap, Target, BarChart3, DollarSign } from "lucide-react";
import WaitlistForm from "@/components/WaitlistForm";
import PremiumGate from "@/components/PremiumGate";
import { hasFeature } from "@/lib/feature-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getHoldings, currencyPrefix } from "@/lib/storage";
import { getCachedPrice } from "@/lib/price-cache";
import { useSimFees } from "@/contexts/SimFeesContext";
import {
  greedyAllocateBudget,
  type CapitalOptimizerModeId,
  CAPITAL_OPTIMIZER_DEFAULT_MODE,
} from "@/lib/dca-sim";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CapitalOptimizer() {
  const optimizerUnlocked = hasFeature("optimizer");
  const holdings = getHoldings();
  const { includeFees, setIncludeFees } = useSimFees();
  const [budgetInput, setBudgetInput] = useState("2000");
  const [tick, setTick] = useState(0);
  const [lastRun, setLastRun] = useState<ReturnType<typeof greedyAllocateBudget> | null>(null);
  const [optimizerMode, setOptimizerMode] = useState<CapitalOptimizerModeId>(CAPITAL_OPTIMIZER_DEFAULT_MODE);

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
    if (optimizerMode !== "greedy_improvement_per_dollar") {
      setLastRun(null);
      return;
    }
    setLastRun(greedyAllocateBudget(holdings, livePrices, budget, includeFees, { chunk: 100 }));
  };

  return (
    <div className="relative min-h-[max(884px,100dvh)] overflow-x-hidden bg-stitch-bg pb-28 font-sans text-white antialiased">
      <header className="mb-8 px-4 pt-12 text-center sm:px-6 md:px-8">
        <div className="mx-auto flex max-w-md flex-col items-center gap-1">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 shrink-0 text-stitch-accent" />
            <h1 className="text-3xl font-bold leading-tight tracking-tight">Capital Optimizer</h1>
          </div>
          <p className="text-xs text-stitch-muted">
            One heuristic mode runs today (see below). Not a globally optimal portfolio solver — illustrative only.
          </p>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-md flex-1 flex-col gap-4 px-4 pb-8 sm:px-6 md:px-8">
        {!optimizerUnlocked ? (
          <PremiumGate feature="optimizer" className="min-h-[280px]" />
        ) : (
          <>
        <section className="space-y-4">
          <p className="text-sm leading-relaxed text-stitch-muted">
            Enter a single budget. The model assigns $100 chunks to whichever underwater holding shows the highest modeled
            average improvement per dollar at that moment, then repeats until the budget is used or no eligible holding
            remains.
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
                className="flex items-center gap-2.5 rounded-2xl border border-stitch-border/60 bg-stitch-pill/30 px-3.5 py-3"
              >
                <Icon className="h-4 w-4 shrink-0 text-stitch-accent" />
                <span className="text-xs font-medium text-white">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-stitch-border bg-stitch-pill/25 p-4">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stitch-muted">
            Optimization approach
          </h3>
          <RadioGroup
            value={optimizerMode}
            onValueChange={(v) => setOptimizerMode(v as CapitalOptimizerModeId)}
            className="space-y-3"
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value="greedy_improvement_per_dollar" id="opt-greedy" className="mt-0.5 border-stitch-border" />
              <Label htmlFor="opt-greedy" className="cursor-pointer text-left text-xs font-normal leading-snug text-stitch-muted">
                <span className="font-medium text-white">Improvement per dollar (chunked greedy)</span>
                <span className="mt-0.5 block text-[10px] text-stitch-muted/85">
                  $100 chunks to the underwater holding with the highest modeled improvement-per-dollar at each step — current
                  implementation.
                </span>
              </Label>
            </div>
            <div className="flex items-start gap-3 opacity-50">
              <RadioGroupItem value="lowest_portfolio_average" id="opt-lowest" disabled className="mt-0.5 border-stitch-border" />
              <Label htmlFor="opt-lowest" className="text-left text-xs font-normal leading-snug text-stitch-muted">
                <span className="font-medium text-white">Lowest portfolio average</span>
                <span className="mt-0.5 block text-[10px]">Roadmap — not implemented.</span>
              </Label>
            </div>
            <div className="flex items-start gap-3 opacity-50">
              <RadioGroupItem
                value="reach_target_averages_first"
                id="opt-targets"
                disabled
                className="mt-0.5 border-stitch-border"
              />
              <Label htmlFor="opt-targets" className="text-left text-xs font-normal leading-snug text-stitch-muted">
                <span className="font-medium text-white">Reach target averages first</span>
                <span className="mt-0.5 block text-[10px]">Roadmap — not implemented.</span>
              </Label>
            </div>
          </RadioGroup>
        </section>

        <section className="relative overflow-hidden rounded-[32px] border border-stitch-border bg-stitch-card p-6 shadow-lg">
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-stitch-accent/10 blur-3xl" />
          <div className="relative z-10 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="optimizer-budget" className="text-xs text-stitch-muted">
                  Budget (numeric — same units as your position currencies)
                </Label>
                <Input
                  id="optimizer-budget"
                  type="number"
                  min={0}
                  step={100}
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="border-stitch-border bg-stitch-pill font-mono text-white placeholder:text-stitch-muted/50 focus-visible:ring-stitch-accent"
                />
              </div>
              <Button
                type="button"
                className="shrink-0 bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
                onClick={runModel}
                disabled={optimizerMode !== "greedy_improvement_per_dollar"}
              >
                Model allocation
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-stitch-border bg-stitch-pill px-4 py-3">
              <Label htmlFor="optimizer-sim-fees" className="cursor-pointer text-xs text-stitch-muted">
                Include fees in simulation
              </Label>
              <Switch id="optimizer-sim-fees" checked={includeFees} onCheckedChange={setIncludeFees} />
            </div>

            <p className="text-[10px] text-stitch-muted">
              <Link to="/update-prices" className="text-stitch-accent underline underline-offset-2">
                Refresh prices
              </Link>{" "}
              first if results look empty.{" "}
              <button
                type="button"
                className="text-stitch-accent underline underline-offset-2"
                onClick={() => setTick((t) => t + 1)}
              >
                Reload cache
              </button>
            </p>

            {hasMixedCurrency && (
              <p className="text-[10px] text-amber-400/90">
                You hold both US and TSX positions. One budget number mixes currencies without FX — treat totals as
                notional, not a single real-world bank balance.
              </p>
            )}

            {lastRun && (
              <div className="overflow-hidden rounded-2xl border border-stitch-border">
                <div className="flex flex-col gap-1 border-b border-stitch-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-semibold text-stitch-muted">Modeled allocation</span>
                  <span className="font-mono text-xs font-semibold text-stitch-accent">
                    Used {fmt(lastRun.usedBudget)} · Unallocated {fmt(lastRun.remainingBudget)}
                  </span>
                </div>
                {lastRun.lines.length === 0 ? (
                  <p className="p-4 text-sm text-stitch-muted">
                    No modeled deploys — need underwater positions (price below avg) and cached quotes for them.
                  </p>
                ) : (
                  <div className="divide-y divide-stitch-border">
                    {lastRun.lines.map((line, i) => {
                      const cp = currencyPrefix(line.exchange);
                      return (
                        <div key={line.holdingId} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="w-4 shrink-0 font-mono text-[10px] text-stitch-muted/50">{i + 1}</span>
                            <span className="truncate font-mono text-sm font-bold text-white">{line.ticker}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-4 text-right">
                            <div>
                              <p className="font-mono text-xs font-semibold text-white">
                                {cp}
                                {fmt(line.allocated)}
                              </p>
                              <p className="font-mono text-[10px] text-stitch-muted">deploy</p>
                            </div>
                            <div>
                              <p className="font-mono text-xs text-stitch-muted">
                                {cp}
                                {fmt(line.newAvg)}
                              </p>
                              <p className="font-mono text-[10px] font-semibold text-stitch-accent">
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
                <div className="border-t border-stitch-border bg-stitch-accent/5 px-4 py-3">
                  <p className="text-center text-[11px] text-stitch-muted">
                    Heuristic simulation only — not financial advice or an optimal portfolio solution.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
          </>
        )}

        {!optimizerUnlocked && (
        <section className="relative overflow-hidden rounded-[32px] border border-stitch-border bg-stitch-card p-6 shadow-lg">
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-stitch-accent/10 blur-3xl" />
          <div className="relative z-10">
            <h2 className="text-[17px] font-semibold text-white">Get early access</h2>
            <p className="mt-1 text-sm text-stitch-muted">
              Tell us what you want next for optimizer-style tools and we will follow up.
            </p>
            <div className="mt-5">
              <WaitlistForm defaultFeature="optimizer" />
            </div>
          </div>
        </section>
        )}
      </main>
    </div>
  );
}
