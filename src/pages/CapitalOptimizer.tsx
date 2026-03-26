import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Target, BarChart3, DollarSign } from "lucide-react";
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
import { useStorageRevision } from "@/hooks/use-storage-revision";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CapitalOptimizer() {
  useStorageRevision();
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
    <div className="relative min-h-[max(884px,100dvh)] overflow-x-hidden bg-stitch-bg pb-28 font-sans text-foreground antialiased">
      <main className="relative z-10 mx-auto flex max-w-md flex-1 flex-col gap-4 px-4 pb-8 pt-12 sm:px-6 md:px-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Budget lab</h1>
        <p className="text-xs text-stitch-muted">
          One heuristic mode runs today (see below). Illustrative budget split only — not an optimal or recommended
          allocation.
        </p>
        {!optimizerUnlocked ? (
          <PremiumGate feature="optimizer" className="min-h-[280px]" />
        ) : (
          <>
        <section className="space-y-4">
          <p className="text-sm leading-relaxed text-stitch-muted">
            Enter a single budget. The model assigns $100 chunks using a fixed rule: at each step it picks the underwater
            holding with the largest modeled average cost change per dollar spent, then repeats until the budget is used or
            no eligible holding remains. For comparison only — not what you should do next.
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
                className="card-secondary flex items-center gap-2.5 bg-stitch-pill/30 px-3.5 py-3 transition-interactive"
              >
                <Icon className="h-4 w-4 shrink-0 text-stitch-accent" />
                <span className="text-xs font-medium text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card-secondary bg-stitch-pill/25 p-4">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stitch-muted">
            Modeling approach
          </h3>
          <RadioGroup
            value={optimizerMode}
            onValueChange={(v) => setOptimizerMode(v as CapitalOptimizerModeId)}
            className="space-y-3"
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value="greedy_improvement_per_dollar" id="opt-greedy" className="mt-0.5 border-stitch-border" />
              <Label htmlFor="opt-greedy" className="cursor-pointer text-left text-xs font-normal leading-snug text-stitch-muted">
                <span className="font-medium text-foreground">Avg cost change per dollar (chunked greedy)</span>
                <span className="mt-0.5 block text-[10px] text-stitch-muted/85">
                  $100 chunks to the underwater holding with the largest modeled average cost change per dollar at each step
                  — current implementation.
                </span>
              </Label>
            </div>
            <div className="flex items-start gap-3 opacity-50">
              <RadioGroupItem value="lowest_portfolio_average" id="opt-lowest" disabled className="mt-0.5 border-stitch-border" />
              <Label htmlFor="opt-lowest" className="text-left text-xs font-normal leading-snug text-stitch-muted">
                <span className="font-medium text-foreground">Lowest portfolio average</span>
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
                <span className="font-medium text-foreground">Modeled scenario averages first</span>
                <span className="mt-0.5 block text-[10px]">Roadmap — not implemented.</span>
              </Label>
            </div>
          </RadioGroup>
        </section>

        <section className="card-primary rounded-[32px] p-6">
          <div className="card-primary-glow" aria-hidden />
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
                  className="input-stitch h-10 font-mono text-foreground placeholder:text-stitch-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-stitch-border dark:bg-stitch-pill dark:focus-visible:ring-2 dark:focus-visible:ring-ring dark:focus-visible:ring-offset-2"
                />
              </div>
              <Button
                type="button"
                className="shrink-0 border border-stitch-accent/45 bg-stitch-accent/75 font-semibold text-black transition-interactive hover:bg-stitch-accent/65 active:opacity-95"
                onClick={runModel}
                disabled={optimizerMode !== "greedy_improvement_per_dollar"}
              >
                Model allocation
              </Button>
            </div>

            <div className="stitch-toggle-row flex items-center justify-between card-secondary bg-stitch-pill/40 px-4 py-3">
              <Label htmlFor="optimizer-sim-fees" className="cursor-pointer text-xs text-stitch-muted">
                Include fees in simulation
              </Label>
              <Switch id="optimizer-sim-fees" checked={includeFees} onCheckedChange={setIncludeFees} />
            </div>

            <p className="text-[10px] leading-relaxed text-stitch-muted">
              <Link to="/update-prices" className="text-stitch-accent underline underline-offset-2 transition-interactive hover:text-stitch-accent/90">
                Refresh prices
              </Link>{" "}
              if results look empty.{" "}
              <button
                type="button"
                className="text-stitch-accent underline underline-offset-2 transition-interactive hover:text-stitch-accent/90"
                onClick={() => setTick((t) => t + 1)}
              >
                Reload cache
              </button>
            </p>

            {hasMixedCurrency && (
              <p className="rounded-md border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2.5 text-[10px] leading-relaxed text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/[0.08] dark:text-amber-200/90">
                US and TSX positions are mixed — one budget line mixes currencies without FX. Treat totals as notional, not
                a single bank balance.
              </p>
            )}

            {lastRun && (
              <div className="card-secondary overflow-hidden bg-stitch-pill/10">
                <div className="flex flex-col gap-1 border-b border-stitch-border/30 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-semibold text-stitch-muted">Modeled allocation</span>
                  <span className="font-mono text-xs font-semibold text-stitch-accent">
                    Used {fmt(lastRun.usedBudget)} · Unallocated {fmt(lastRun.remainingBudget)}
                  </span>
                </div>
                {lastRun.lines.length === 0 ? (
                  <p className="p-4 text-sm text-stitch-muted leading-relaxed">
                    No modeled deploys — underwater positions and cached quotes required.
                  </p>
                ) : (
                  <div className="divide-y divide-stitch-border/25">
                    {lastRun.lines.map((line, i) => {
                      const cp = currencyPrefix(line.exchange);
                      return (
                        <div key={line.holdingId} className="flex items-center justify-between gap-3 px-4 py-3.5">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="w-4 shrink-0 font-mono text-[10px] text-stitch-muted/50">{i + 1}</span>
                            <span className="truncate font-mono text-sm font-bold text-foreground">{line.ticker}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-4 text-right">
                            <div>
                              <p className="font-mono text-xs font-semibold text-foreground">
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
                <div className="border-t border-stitch-border/30 bg-stitch-accent/[0.04] px-4 py-3">
                  <p className="text-center text-[11px] text-stitch-muted/90 leading-relaxed">
                    Heuristic simulation — not advice; not a recommended allocation.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
          </>
        )}

        {!optimizerUnlocked && (
        <section className="card-primary rounded-[32px] p-6">
          <div className="card-primary-glow" aria-hidden />
          <div className="relative z-10">
            <h2 className="text-[17px] font-semibold text-foreground">Get early access</h2>
            <p className="mt-1 text-sm text-stitch-muted">
              Tell us what you want next for budget-allocation modeling and we will follow up.
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
