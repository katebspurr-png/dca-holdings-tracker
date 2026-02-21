import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save, Percent, DollarSign, Shuffle, BarChart3, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  getHoldings, addWhatIfComparison,
  type Holding, type WhatIfScenarioTab, type WhatIfAllocation,
} from "@/lib/storage";
import { toast } from "sonner";

const MAX_SCENARIOS = 3;
const DEFAULT_NAMES = ["Scenario A", "Scenario B", "Scenario C"];

function makeAllocations(holdings: Holding[]): WhatIfAllocation[] {
  return holdings.map((h) => ({
    holdingId: h.id,
    ticker: h.ticker,
    currentShares: h.shares,
    currentAvg: h.avg_cost,
    buyPrice: null,
    allocated: 0,
  }));
}

function makeScenario(name: string, holdings: Holding[]): WhatIfScenarioTab {
  return { name, allocations: makeAllocations(holdings) };
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function WhatIfScenarios() {
  const navigate = useNavigate();
  const holdings = getHoldings();

  const [totalBudget, setTotalBudget] = useState("");
  const [scenarios, setScenarios] = useState<WhatIfScenarioTab[]>([
    makeScenario(DEFAULT_NAMES[0], holdings),
  ]);
  const [activeTab, setActiveTab] = useState(0);
  const [inputMode, setInputMode] = useState<"dollar" | "percent">("dollar");

  const budget = parseFloat(totalBudget) || 0;

  // ── Helpers ────────────────────────────────────────────────

  const updateAllocation = (scenarioIdx: number, allocIdx: number, patch: Partial<WhatIfAllocation>) => {
    setScenarios((prev) =>
      prev.map((s, si) =>
        si === scenarioIdx
          ? { ...s, allocations: s.allocations.map((a, ai) => (ai === allocIdx ? { ...a, ...patch } : a)) }
          : s
      )
    );
  };

  const addScenarioTab = () => {
    if (scenarios.length >= MAX_SCENARIOS) return;
    setScenarios((prev) => [...prev, makeScenario(DEFAULT_NAMES[prev.length], holdings)]);
    setActiveTab(scenarios.length);
  };

  const removeScenarioTab = (idx: number) => {
    if (scenarios.length <= 1) return;
    setScenarios((prev) => prev.filter((_, i) => i !== idx));
    setActiveTab((prev) => Math.min(prev, scenarios.length - 2));
  };

  // ── Quick-fill functions ───────────────────────────────────

  const splitEvenly = useCallback(() => {
    if (!budget) return;
    const validCount = scenarios[activeTab].allocations.filter((a) => a.buyPrice && a.buyPrice > 0).length;
    if (!validCount) return;
    const perStock = budget / validCount;
    setScenarios((prev) =>
      prev.map((s, si) =>
        si === activeTab
          ? { ...s, allocations: s.allocations.map((a) => ({ ...a, allocated: a.buyPrice && a.buyPrice > 0 ? perStock : 0 })) }
          : s
      )
    );
  }, [budget, activeTab, scenarios]);

  const proportional = useCallback(() => {
    if (!budget) return;
    const allocs = scenarios[activeTab].allocations.filter((a) => a.buyPrice && a.buyPrice > 0);
    const totalValue = allocs.reduce((sum, a) => sum + a.currentShares * a.currentAvg, 0);
    if (!totalValue) return;
    setScenarios((prev) =>
      prev.map((s, si) =>
        si === activeTab
          ? {
              ...s,
              allocations: s.allocations.map((a) => ({
                ...a,
                allocated: a.buyPrice && a.buyPrice > 0 ? (a.currentShares * a.currentAvg / totalValue) * budget : 0,
              })),
            }
          : s
      )
    );
  }, [budget, activeTab, scenarios]);

  const clearAllocations = useCallback(() => {
    setScenarios((prev) =>
      prev.map((s, si) =>
        si === activeTab ? { ...s, allocations: s.allocations.map((a) => ({ ...a, allocated: 0 })) } : s
      )
    );
  }, [activeTab]);

  // ── Computed results ───────────────────────────────────────

  const scenarioResults = useMemo(() => {
    return scenarios.map((s) => {
      const rows = s.allocations.map((a) => {
        if (!a.buyPrice || a.buyPrice <= 0 || a.allocated <= 0) {
          return { ...a, sharesBought: 0, newTotalShares: a.currentShares, newAvg: a.currentAvg, reduction: 0, reductionPct: 0 };
        }
        const sharesBought = a.allocated / a.buyPrice;
        const newTotalShares = a.currentShares + sharesBought;
        const newAvg = (a.currentShares * a.currentAvg + a.allocated) / newTotalShares;
        const reduction = a.currentAvg - newAvg;
        const reductionPct = (reduction / a.currentAvg) * 100;
        return { ...a, sharesBought, newTotalShares, newAvg, reduction, reductionPct };
      });
      const totalAllocated = s.allocations.reduce((sum, a) => sum + a.allocated, 0);
      const totalNewShares = rows.reduce((sum, r) => sum + r.sharesBought, 0);
      const weightedReduction = rows.reduce((sum, r) => sum + r.reduction * r.currentShares, 0);
      const totalWeight = rows.reduce((sum, r) => sum + r.currentShares, 0);
      const avgReduction = totalWeight > 0 ? weightedReduction / totalWeight : 0;
      return { rows, totalAllocated, totalNewShares, avgReduction };
    });
  }, [scenarios]);

  const activeResult = scenarioResults[activeTab];
  const unallocated = budget - (activeResult?.totalAllocated ?? 0);

  // ── Save comparison ────────────────────────────────────────

  const handleSave = () => {
    if (!budget || scenarios.every((s) => s.allocations.every((a) => a.allocated === 0))) {
      toast.error("Add allocations before saving");
      return;
    }
    addWhatIfComparison({ totalBudget: budget, scenarios });
    toast.success("Comparison saved");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-5">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">What-If Scenarios</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        {/* Budget input */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="total-budget" className="text-sm font-semibold">Total Budget to Allocate</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="total-budget"
                  type="number"
                  step="any"
                  placeholder="3000"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  className="pl-9 text-lg font-mono"
                />
              </div>
            </div>
            <div className="flex items-center gap-1 pt-6">
              <Button
                size="sm"
                variant={inputMode === "dollar" ? "default" : "outline"}
                onClick={() => setInputMode("dollar")}
              >
                <DollarSign className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant={inputMode === "percent" ? "default" : "outline"}
                onClick={() => setInputMode("percent")}
              >
                <Percent className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {budget > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Unallocated:</span>
              <span className={`font-mono font-semibold ${unallocated < 0 ? "text-destructive" : unallocated === 0 ? "text-primary" : ""}`}>
                ${fmt(unallocated)}
              </span>
              {unallocated < 0 && <Badge variant="destructive" className="text-xs">Over budget</Badge>}
            </div>
          )}
        </div>

        {/* Scenario tabs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Tabs value={String(activeTab)} onValueChange={(v) => setActiveTab(Number(v))} className="flex-1">
              <TabsList>
                {scenarios.map((s, i) => (
                  <TabsTrigger key={i} value={String(i)} className="gap-1.5">
                    {s.name}
                    {scenarios.length > 1 && (
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); removeScenarioTab(i); }}
                        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-xs hover:bg-foreground/10"
                      >
                        ×
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {scenarios.length < MAX_SCENARIOS && (
              <Button size="sm" variant="outline" onClick={addScenarioTab}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Scenario
              </Button>
            )}
          </div>

          {/* Quick-fill buttons */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={splitEvenly} disabled={!budget}>
              <Scale className="mr-1.5 h-3.5 w-3.5" />
              Split Evenly
            </Button>
            <Button size="sm" variant="outline" onClick={proportional} disabled={!budget}>
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
              Proportional
            </Button>
            <Button size="sm" variant="outline" onClick={clearAllocations}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          </div>

          {/* Allocation rows */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  <th className="px-3 py-2.5 text-left font-medium">Ticker</th>
                  <th className="px-3 py-2.5 text-right font-medium">Shares</th>
                  <th className="px-3 py-2.5 text-right font-medium">Avg Cost</th>
                  <th className="px-3 py-2.5 text-right font-medium">Buy Price</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    {inputMode === "dollar" ? "Allocate ($)" : "Allocate (%)"}
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">Shares Bought</th>
                  <th className="px-3 py-2.5 text-right font-medium">New Avg</th>
                  <th className="px-3 py-2.5 text-right font-medium">Reduction</th>
                </tr>
              </thead>
              <tbody>
                {scenarios[activeTab].allocations.map((alloc, ai) => {
                  const row = activeResult?.rows[ai];
                  const hasBuyPrice = alloc.buyPrice && alloc.buyPrice > 0;
                  return (
                    <tr key={alloc.holdingId} className={`border-t border-border ${!hasBuyPrice ? "opacity-50" : ""}`}>
                      <td className="px-3 py-2 font-mono font-semibold">{alloc.ticker}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(alloc.currentShares)}</td>
                      <td className="px-3 py-2 text-right font-mono">${fmt(alloc.currentAvg)}</td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          step="any"
                          placeholder="Price"
                          className="w-24 ml-auto text-right font-mono h-8 text-sm"
                          value={alloc.buyPrice ?? ""}
                          onChange={(e) => {
                            const v = e.target.value === "" ? null : parseFloat(e.target.value);
                            updateAllocation(activeTab, ai, { buyPrice: v });
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {!hasBuyPrice ? (
                          <span className="text-xs text-muted-foreground italic">Enter price</span>
                        ) : (
                          <Input
                            type="number"
                            step="any"
                            placeholder="0"
                            className="w-24 ml-auto text-right font-mono h-8 text-sm"
                            value={inputMode === "dollar"
                              ? (alloc.allocated || "")
                              : (budget > 0 ? ((alloc.allocated / budget) * 100 || "") : "")
                            }
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              const dollars = inputMode === "percent" ? (v / 100) * budget : v;
                              updateAllocation(activeTab, ai, { allocated: dollars });
                            }}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {row && row.sharesBought > 0 ? fmt(row.sharesBought) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {row && row.allocated > 0 ? `$${fmt(row.newAvg)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row && row.reduction > 0 ? (
                          <span className="text-primary font-mono font-semibold">
                            -${fmt(row.reduction)} ({row.reductionPct.toFixed(1)}%)
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Portfolio summary for active scenario */}
          {activeResult && activeResult.totalAllocated > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {scenarios[activeTab].name} — Portfolio Impact
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Allocated</p>
                  <p className="text-lg font-mono font-semibold">${fmt(activeResult.totalAllocated)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">New Shares Bought</p>
                  <p className="text-lg font-mono font-semibold">{fmt(activeResult.totalNewShares)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Weighted Avg Reduction</p>
                  <p className="text-lg font-mono font-semibold text-primary">
                    -${fmt(activeResult.avgReduction)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Comparison table (when 2+ scenarios) */}
        {scenarios.length >= 2 && budget > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Scenario Comparison
            </h2>
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-muted-foreground">
                    <th className="px-3 py-2.5 text-left font-medium">Ticker</th>
                    {scenarios.map((s, i) => (
                      <th key={i} className="px-3 py-2.5 text-center font-medium">{s.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h, hi) => {
                    const reductions = scenarioResults.map((sr) => sr.rows[hi]?.reduction ?? 0);
                    const maxReduction = Math.max(...reductions);
                    return (
                      <tr key={h.id} className="border-t border-border">
                        <td className="px-3 py-2 font-mono font-semibold">{h.ticker}</td>
                        {scenarioResults.map((sr, si) => {
                          const row = sr.rows[hi];
                          const isBest = maxReduction > 0 && row && row.reduction === maxReduction;
                          return (
                            <td key={si} className={`px-3 py-2 text-center font-mono ${isBest ? "text-primary font-semibold" : ""}`}>
                              {row && row.reduction > 0
                                ? `$${fmt(row.newAvg)} (−${row.reductionPct.toFixed(1)}%)`
                                : "—"
                              }
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {/* Summary row */}
                  <tr className="border-t-2 border-border bg-muted/50">
                    <td className="px-3 py-2 font-semibold">Portfolio Impact</td>
                    {scenarioResults.map((sr, si) => {
                      const reductions = scenarioResults.map((s) => s.avgReduction);
                      const maxR = Math.max(...reductions);
                      const isBest = maxR > 0 && sr.avgReduction === maxR;
                      return (
                        <td key={si} className={`px-3 py-2 text-center font-mono ${isBest ? "text-primary font-semibold" : ""}`}>
                          {sr.totalAllocated > 0
                            ? `−$${fmt(sr.avgReduction)} avg`
                            : "—"
                          }
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!budget}>
            <Save className="mr-1.5 h-4 w-4" />
            Save Comparison
          </Button>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center pb-6">
          This tool shows mathematical projections only. It is not financial advice. Always do your own research before making investment decisions.
        </p>
      </main>
    </div>
  );
}
