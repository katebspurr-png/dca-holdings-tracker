import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Save, CheckCircle, ArrowRight, TrendingDown, TrendingUp,
  AlertCircle, Zap, Info, Calculator
} from "lucide-react";
import { hasFeature } from "@/lib/feature-access";
import PremiumGate from "@/components/PremiumGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getHoldings, currencyPrefix, apiTicker, applyBuyToHolding,
  addOptimizationScenario, type Holding, type Exchange,
} from "@/lib/storage";
import { getCachedQuote, type StockQuote } from "@/lib/stock-price";
import { useToast } from "@/hooks/use-toast";

const fmt2 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt4 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

type HoldingWithPrice = Holding & { quote: StockQuote | null; price: number | null };

type AllocationResult = {
  holding: HoldingWithPrice;
  budget: number;
  shares: number;
  fee: number;
  totalSpend: number;
  newAvg: number;
  newTotalShares: number;
  improvement: number;
  improvementPerDollar: number;
  explanation: string;
};

type OptimizationResult = {
  allocations: AllocationResult[];
  totalBudget: number;
  totalFees: number;
  totalSpend: number;
  currentPortfolioAvg: number;
  projectedPortfolioAvg: number;
};

function computeFee(feeType: string, feeValue: number, budget: number): number {
  if (feeType === "percent") return budget * (feeValue / 100);
  return feeValue;
}

function runOptimization(
  holdings: HoldingWithPrice[],
  totalBudget: number,
  includeFees: boolean,
): OptimizationResult | null {
  const eligible = holdings.filter((h) => h.price != null && h.price > 0);
  if (eligible.length === 0) return null;

  // Score each holding: how much avg improves per $1 invested
  const scored = eligible.map((h) => {
    const price = h.price!;
    const gap = h.avg_cost - price; // positive = buying below avg (good)
    const gapRatio = h.avg_cost > 0 ? gap / h.avg_cost : 0;
    // Simulate investing $100 to get improvement rate
    const testBudget = 100;
    const testShares = testBudget / price;
    const testFee = includeFees ? computeFee(h.fee_type, h.fee_value, testBudget) : 0;
    const testNewAvg = (h.shares * h.avg_cost + testBudget + testFee) / (h.shares + testShares);
    const testImprovement = h.avg_cost - testNewAvg;
    const improvementPerDollar = testImprovement / (testBudget + testFee);

    return { holding: h, gap, gapRatio, improvementPerDollar, price };
  });

  // Filter out holdings where buying raises avg (gap <= 0)
  const beneficial = scored.filter((s) => s.gap > 0);
  const nonBeneficial = scored.filter((s) => s.gap <= 0);

  if (beneficial.length === 0) {
    // All holdings are at or below current price — distribute evenly
    const perHolding = totalBudget / eligible.length;
    const allocations = eligible.map((h) => buildAllocation(h, perHolding, includeFees, "Current price at/above avg"));
    return buildResult(allocations, totalBudget);
  }

  // Allocate proportionally by improvement-per-dollar score
  const totalScore = beneficial.reduce((sum, s) => sum + Math.max(s.improvementPerDollar, 0.0001), 0);
  let remaining = totalBudget;
  const MIN_ALLOC = 25; // Minimum allocation to avoid fee-inefficient tiny buys

  const rawAllocations = beneficial.map((s) => {
    const weight = Math.max(s.improvementPerDollar, 0.0001) / totalScore;
    const raw = totalBudget * weight;
    return { ...s, rawBudget: raw };
  });

  // Filter out allocations that would be too small
  const viable = rawAllocations.filter((a) => a.rawBudget >= MIN_ALLOC);
  if (viable.length === 0) {
    // Give everything to the best single holding
    const best = beneficial.sort((a, b) => b.improvementPerDollar - a.improvementPerDollar)[0];
    const allocations = [buildAllocation(best.holding, totalBudget, includeFees, "High avg-cost improvement potential")];
    // Add non-allocated
    const rest = eligible.filter((h) => h.id !== best.holding.id);
    rest.forEach((h) => allocations.push(buildAllocation(h, 0, includeFees, "No allocation in this simulation")));
    return buildResult(allocations, totalBudget);
  }

  // Redistribute among viable
  const viableScore = viable.reduce((sum, s) => sum + Math.max(s.improvementPerDollar, 0.0001), 0);
  const allocations: AllocationResult[] = [];

  for (const v of viable) {
    const weight = Math.max(v.improvementPerDollar, 0.0001) / viableScore;
    const budget = Math.min(remaining, totalBudget * weight);
    remaining -= budget;

    let explanation = "Strong improvement per dollar";
    if (v.gapRatio > 0.3) explanation = "High avg-cost improvement potential";
    else if (v.improvementPerDollar > 0.001) explanation = "Fee-efficient allocation";

    allocations.push(buildAllocation(v.holding, budget, includeFees, explanation));
  }

  // Handle remainder from rounding
  if (remaining > 0.01 && allocations.length > 0) {
    allocations[0].budget += remaining;
    recalcAllocation(allocations[0], includeFees);
  }

  // Add non-beneficial / non-viable holdings
  const allocatedIds = new Set(allocations.map((a) => a.holding.id));
  for (const h of eligible) {
    if (!allocatedIds.has(h.id)) {
      allocations.push(buildAllocation(h, 0, includeFees, h.price! >= h.avg_cost ? "Price at or above average" : "No allocation in this simulation"));
    }
  }

  return buildResult(allocations, totalBudget);
}

function buildAllocation(h: HoldingWithPrice, budget: number, includeFees: boolean, explanation: string): AllocationResult {
  const price = h.price ?? 0;
  if (budget <= 0 || price <= 0) {
    return {
      holding: h, budget: 0, shares: 0, fee: 0, totalSpend: 0,
      newAvg: h.avg_cost, newTotalShares: h.shares,
      improvement: 0, improvementPerDollar: 0, explanation,
    };
  }
  const shares = budget / price;
  const fee = includeFees ? computeFee(h.fee_type, h.fee_value, budget) : 0;
  const totalSpend = budget + fee;
  const newTotalShares = h.shares + shares;
  const newAvg = (h.shares * h.avg_cost + budget + fee) / newTotalShares;
  const improvement = h.avg_cost - newAvg;
  const improvementPerDollar = totalSpend > 0 ? improvement / totalSpend : 0;
  return { holding: h, budget, shares, fee, totalSpend, newAvg, newTotalShares, improvement, improvementPerDollar, explanation };
}

function recalcAllocation(a: AllocationResult, includeFees: boolean) {
  const price = a.holding.price ?? 0;
  if (a.budget <= 0 || price <= 0) return;
  a.shares = a.budget / price;
  a.fee = includeFees ? computeFee(a.holding.fee_type, a.holding.fee_value, a.budget) : 0;
  a.totalSpend = a.budget + a.fee;
  a.newTotalShares = a.holding.shares + a.shares;
  a.newAvg = (a.holding.shares * a.holding.avg_cost + a.budget + a.fee) / a.newTotalShares;
  a.improvement = a.holding.avg_cost - a.newAvg;
  a.improvementPerDollar = a.totalSpend > 0 ? a.improvement / a.totalSpend : 0;
}

function buildResult(allocations: AllocationResult[], totalBudget: number): OptimizationResult {
  const totalFees = allocations.reduce((s, a) => s + a.fee, 0);
  const totalSpend = allocations.reduce((s, a) => s + a.totalSpend, 0);
  const currentCostBasis = allocations.reduce((s, a) => s + a.holding.shares * a.holding.avg_cost, 0);
  const currentShares = allocations.reduce((s, a) => s + a.holding.shares, 0);
  const currentPortfolioAvg = currentShares > 0 ? currentCostBasis / currentShares : 0;

  const projCostBasis = allocations.reduce((s, a) => s + a.newTotalShares * a.newAvg, 0);
  const projShares = allocations.reduce((s, a) => s + a.newTotalShares, 0);
  const projectedPortfolioAvg = projShares > 0 ? projCostBasis / projShares : 0;

  return { allocations, totalBudget, totalFees, totalSpend, currentPortfolioAvg, projectedPortfolioAvg };
}

export default function CapitalPlanner() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [budget, setBudget] = useState("");
  const [includeFees, setIncludeFees] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [initialized, setInitialized] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [confirmApply, setConfirmApply] = useState<AllocationResult | null>(null);

  const holdingsWithPrice: HoldingWithPrice[] = useMemo(() => {
    const holdings = getHoldings();
    const mapped = holdings.map((h) => {
      const q = getCachedQuote(apiTicker(h.ticker, h.exchange).toUpperCase());
      return { ...h, quote: q, price: q?.price ?? null };
    });
    // Initialize selection on first render
    if (!initialized && mapped.length > 0) {
      setSelectedIds(new Set(mapped.map((h) => h.id)));
      setInitialized(true);
    }
    return mapped;
  }, [initialized]);

  const selectedHoldings = holdingsWithPrice.filter((h) => selectedIds.has(h.id));
  const eligibleCount = selectedHoldings.filter((h) => h.price != null && h.price > 0).length;
  const budgetNum = parseFloat(budget);
  const budgetValid = !isNaN(budgetNum) && budgetNum > 0;

  const toggleHolding = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setResult(null);
  };

  const handleRun = () => {
    if (!budgetValid || eligibleCount === 0) return;
    const r = runOptimization(selectedHoldings, budgetNum, includeFees);
    setResult(r);
  };

  const handleSave = () => {
    if (!result) return;
    addOptimizationScenario({
      name: `Optimization — ${new Date().toLocaleDateString()}`,
      total_budget: result.totalBudget,
      include_fees: includeFees,
      optimization_mode: "minimize_weighted_avg",
      selected_holdings_json: JSON.stringify(selectedHoldings.map((h) => h.id)),
      allocation_results_json: JSON.stringify(result.allocations.map((a) => ({
        holdingId: a.holding.id, ticker: a.holding.ticker, budget: a.budget,
        shares: a.shares, fee: a.fee, totalSpend: a.totalSpend,
        newAvg: a.newAvg, newTotalShares: a.newTotalShares,
      }))),
      projected_portfolio_avg: result.projectedPortfolioAvg,
      total_fees: result.totalFees,
      total_spend: result.totalSpend,
    });
    toast({ title: "Plan saved" });
  };

  const confirmApplyBuy = () => {
    if (!confirmApply) return;
    const a = confirmApply;
    setApplyingId(a.holding.id);
    setConfirmApply(null);
    try {
      const fee = includeFees ? computeFee(a.holding.fee_type, a.holding.fee_value, a.budget) : 0;
      applyBuyToHolding({
        holdingId: a.holding.id,
        buyPrice: a.holding.price!,
        sharesBought: a.shares,
        budgetInvested: a.budget,
        feeApplied: fee,
        totalSpend: a.totalSpend,
        includeFees,
        newTotalShares: a.newTotalShares,
        newAvgCost: a.newAvg,
        method: "planner",
      });
      toast({ title: `Buy applied to ${a.holding.ticker}` });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    } finally {
      setApplyingId(null);
    }
  };

  if (!hasFeature("planner")) {
    return (
      <div className="min-h-screen bg-background pb-28">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold tracking-tight">Capital Planner</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Simulates how a budget could be distributed across positions.
            </p>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
          <PremiumGate feature="planner" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">Capital Planner</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Simulates how a budget could be distributed across positions.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6">
        {/* Inputs panel */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-5">
          {/* Budget */}
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
              Total budget to allocate
            </Label>
            <p className="text-[10px] text-muted-foreground/60">Amount invested in shares, excluding fees.</p>
            <Input
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 5000"
              value={budget}
              onChange={(e) => { setBudget(e.target.value); setResult(null); }}
              className="h-9 font-mono text-sm bg-background max-w-xs"
            />
            {budget !== "" && !budgetValid && (
              <p className="text-[10px] text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Enter a positive number
              </p>
            )}
          </div>

          {/* Holdings selection */}
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
              Holdings to include
            </Label>
            {holdingsWithPrice.length === 0 ? (
              <p className="text-xs text-muted-foreground">No holdings found. Add holdings first.</p>
            ) : (
              <div className="grid gap-1.5">
                {holdingsWithPrice.map((h) => {
                  const cp = currencyPrefix(h.exchange);
                  const hasPrice = h.price != null && h.price > 0;
                  const checked = selectedIds.has(h.id);
                  return (
                    <label
                      key={h.id}
                      className={`flex items-center gap-3 rounded-lg border p-2.5 transition-colors cursor-pointer ${
                        checked ? "border-primary/30 bg-primary/[0.02]" : "border-border"
                      } ${!hasPrice ? "opacity-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleHolding(h.id)}
                        className="accent-primary h-3.5 w-3.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-sm">{h.ticker}</span>
                          <Badge variant="outline" className="text-[9px] px-1 h-4">{h.exchange}</Badge>
                        </div>
                        <div className="flex gap-3 text-[10px] text-muted-foreground font-mono mt-0.5">
                          <span>{h.shares.toFixed(2)} shares</span>
                          <span>Avg {cp}{fmt2(h.avg_cost)}</span>
                          {hasPrice ? (
                            <span className={h.price! < h.avg_cost ? "text-primary" : "text-destructive"}>
                              Price {cp}{fmt2(h.price!)}
                            </span>
                          ) : (
                            <span className="text-destructive/70 italic">Current price required</span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fee toggle */}
          <div className="flex items-center gap-2.5">
            <Switch checked={includeFees} onCheckedChange={(v) => { setIncludeFees(v); setResult(null); }} className="scale-90" />
            <Label className="cursor-pointer text-xs text-muted-foreground">Include fees</Label>
          </div>

          {/* Run button */}
          <Button
            onClick={handleRun}
            disabled={!budgetValid || eligibleCount === 0}
            className="h-9"
          >
            <Zap className="mr-1.5 h-4 w-4" />
            Run Simulation
          </Button>

          {eligibleCount === 0 && holdingsWithPrice.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-muted bg-muted/20 p-3">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Add current market prices to your holdings before running optimization.
                Use the <button onClick={() => navigate("/update-prices")} className="text-primary underline">Update Prices</button> page.
              </p>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-5">
            {/* Portfolio summary */}
            <div className="rounded-xl border border-primary/20 bg-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Portfolio Summary
                </h2>
                <Button size="sm" variant="outline" className="h-7 text-[10px] px-2.5" onClick={handleSave}>
                  <Save className="mr-1 h-3 w-3" />
                  Save Plan
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <SummaryStat label="Budget" value={`$${fmt2(result.totalBudget)}`} />
                <SummaryStat label="Total Fees" value={`$${fmt2(result.totalFees)}`} />
                <SummaryStat label="Total Spend" value={`$${fmt2(result.totalSpend)}`} />
                <SummaryStat label="Current Avg" value={`$${fmt2(result.currentPortfolioAvg)}`} />
                <SummaryStat label="Projected Avg" value={`$${fmt2(result.projectedPortfolioAvg)}`} accent />
                <SummaryStat
                  label="Change"
                  value={`${result.currentPortfolioAvg > result.projectedPortfolioAvg ? "−" : "+"}$${fmt2(Math.abs(result.currentPortfolioAvg - result.projectedPortfolioAvg))}`}
                  positive={result.projectedPortfolioAvg < result.currentPortfolioAvg}
                  negative={result.projectedPortfolioAvg > result.currentPortfolioAvg}
                />
              </div>
            </div>

            {/* Allocation cards */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Simulated Allocations
              </h3>
              <div className="grid gap-2">
                {result.allocations
                  .sort((a, b) => b.budget - a.budget)
                  .map((a) => {
                    const cp = currencyPrefix(a.holding.exchange);
                    const hasAlloc = a.budget > 0;
                    const improves = a.improvement > 0.005;

                    return (
                      <div
                        key={a.holding.id}
                        className={`rounded-xl border bg-card p-3.5 transition-all ${
                          hasAlloc ? "border-border" : "border-border/50 opacity-60"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm">{a.holding.ticker}</span>
                              <Badge variant="outline" className="text-[9px] px-1 h-4">{a.holding.exchange}</Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic">{a.explanation}</p>
                          </div>
                          {hasAlloc && improves && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0">
                              <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                              −{cp}{fmt2(a.improvement)}
                            </Badge>
                          )}
                        </div>

                        {hasAlloc ? (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mb-3">
                              <DetailRow label="Current Price" value={`${cp}${fmt2(a.holding.price!)}`} />
                              <DetailRow label="Budget Alloc." value={`${cp}${fmt2(a.budget)}`} accent />
                              <DetailRow label="Est. Shares" value={fmt4(a.shares)} />
                              <DetailRow label="Fee" value={`${cp}${fmt2(a.fee)}`} />
                              <DetailRow label="Total Spend" value={`${cp}${fmt2(a.totalSpend)}`} />
                              <DetailRow label="Current Avg" value={`${cp}${fmt2(a.holding.avg_cost)}`} />
                              <DetailRow label="Projected Avg" value={`${cp}${fmt2(a.newAvg)}`} accent />
                              <DetailRow
                                label="Improvement"
                                value={improves ? `−${cp}${fmt2(a.improvement)}/share` : "—"}
                                positive={improves}
                              />
                            </div>
                            <div className="flex gap-1.5 pt-2 border-t border-border/50">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2"
                                onClick={() => navigate(`/holdings/${a.holding.id}/dca?method=price_budget&val1=${a.holding.price}&val2=${Math.round(a.budget)}`)}
                              >
                                <Calculator className="mr-1 h-2.5 w-2.5" />
                                Open in Calculator
                              </Button>
                              <Button
                                size="sm"
                                className="h-6 text-[10px] px-2"
                                disabled={applyingId === a.holding.id}
                                onClick={() => setConfirmApply(a)}
                              >
                                <CheckCircle className="mr-1 h-2.5 w-2.5" />
                                Apply Buy
                              </Button>
                            </div>
                          </>
                        ) : (
                          <p className="text-[10px] text-muted-foreground/50 italic">No allocation in this simulation</p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Not a financial advice disclaimer */}
        <p className="text-[10px] text-muted-foreground/40 text-center pt-4">
          This is a scenario-planning tool only. Not financial advice. Always do your own research.
        </p>
      </main>

      {/* Apply confirmation */}
      <AlertDialog open={!!confirmApply} onOpenChange={(o) => !o && setConfirmApply(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply simulated buy to {confirmApply?.holding.ticker}?</AlertDialogTitle>

            <AlertDialogDescription>
              This will update the holding's shares and average cost. A transaction record will be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApplyBuy}>Apply</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryStat({ label, value, accent, positive, negative }: {
  label: string; value: string; accent?: boolean; positive?: boolean; negative?: boolean;
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-mono font-semibold leading-tight ${
        accent ? "text-primary" : positive ? "text-primary" : negative ? "text-destructive" : ""
      }`}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value, accent, positive }: {
  label: string; value: string; accent?: boolean; positive?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline sm:block">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`text-[11px] font-mono font-medium tabular-nums sm:block ${
        accent ? "text-primary" : positive ? "text-primary" : ""
      }`}>{value}</span>
    </div>
  );
}
