import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save, Percent, DollarSign, Scale, X, Clock, RefreshCw, Zap, BarChart3, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getHoldings,
  getHolding,
  addWhatIfComparison,
  getWhatIfComparisons,
  removeWhatIfComparison,
  applyBuyToHolding,
  type Holding,
  type WhatIfScenarioTab,
  type WhatIfAllocation,
  type WhatIfComparison,
  type Exchange,
  currencyPrefix,
  exchangeLabel,
  apiTicker,
} from "@/lib/storage";
import { fetchStockPrice, type StockQuote } from "@/lib/stock-price";
import { computeWhatIfAllocationRow } from "@/lib/dca-sim";
import { useSimFees } from "@/contexts/SimFeesContext";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const MAX_SCENARIOS = 3;
const DEFAULT_NAMES = ["Scenario A", "Scenario B", "Scenario C"];
const CACHE_KEY = "dca-price-cache";

function readPriceCache(): Record<string, StockQuote> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getCachedPrice(ticker: string, exchange: Exchange): number | null {
  const cache = readPriceCache();
  const key = apiTicker(ticker, exchange).toUpperCase();
  const entry = cache[key];
  if (!entry) return null;
  return entry.price;
}

function makeAllocations(holdings: Holding[]): WhatIfAllocation[] {
  return holdings.map((h) => {
    const ex = h.exchange ?? "US";
    const cachedPrice = getCachedPrice(h.ticker, ex);
    return {
      holdingId: h.id,
      ticker: h.ticker,
      exchange: ex,
      currentShares: h.shares,
      currentAvg: h.avg_cost,
      buyPrice: cachedPrice,
      allocated: 0,
    };
  });
}

function makeScenario(name: string, holdings: Holding[]): WhatIfScenarioTab {
  return { name, allocations: makeAllocations(holdings) };
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function WhatIfScenarios() {
  const navigate = useNavigate();
  const holdings = getHoldings();
  const { includeFees, setIncludeFees } = useSimFees();

  const [totalBudget, setTotalBudget] = useState("");
  const [scenarios, setScenarios] = useState<WhatIfScenarioTab[]>([
    makeScenario(DEFAULT_NAMES[0], holdings),
  ]);
  const [activeTab, setActiveTab] = useState(0);
  const [inputMode, setInputMode] = useState<"dollar" | "percent">("dollar");
  const [savedRefresh, setSavedRefresh] = useState(0);
  const [fetchingTickers, setFetchingTickers] = useState<Set<string>>(new Set());
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showApplyDialog, setShowApplyDialog] = useState(false);

  const [livePrices, setLivePrices] = useState<Record<string, number>>(() => {
    const prices: Record<string, number> = {};
    holdings.forEach((h) => {
      const ex = h.exchange ?? "US";
      const p = getCachedPrice(h.ticker, ex);
      if (p) prices[apiTicker(h.ticker, ex)] = p;
    });
    return prices;
  });

  const savedComparisons = useMemo(() => getWhatIfComparisons(), [savedRefresh]);

  const budget = parseFloat(totalBudget) || 0;

  // Check if portfolio has mixed currencies
  const hasMixedCurrency = useMemo(() => {
    const exchanges = new Set(holdings.map((h) => h.exchange ?? "US"));
    return exchanges.has("US") && exchanges.has("TSX");
  }, [holdings]);

  // ── Fetch single ticker price ──────────────────────────────

  const fetchPrice = useCallback(async (ticker: string, exchange: Exchange) => {
    const apiSym = apiTicker(ticker, exchange);
    setFetchingTickers((prev) => new Set(prev).add(ticker));
    const result = await fetchStockPrice(apiSym);
    setFetchingTickers((prev) => {
      const next = new Set(prev);
      next.delete(ticker);
      return next;
    });
    if (result.ok) {
      const price = result.quote.price;
      setLivePrices((prev) => ({ ...prev, [apiSym]: price }));
      setScenarios((prev) =>
        prev.map((s) => ({
          ...s,
          allocations: s.allocations.map((a) =>
            a.ticker === ticker ? { ...a, buyPrice: price } : a
          ),
        }))
      );
    } else {
      toast.error(`${ticker}: ${'error' in result ? result.error : "Price unavailable"}`);
    }
  }, []);

  // ── Refresh all prices ─────────────────────────────────────

  const refreshAllPrices = useCallback(async () => {
    setRefreshingAll(true);
    const pairs = holdings.map((h) => ({ ticker: h.ticker, exchange: (h.exchange ?? "US") as Exchange }));
    const apiSymbols = pairs.map((p) => apiTicker(p.ticker, p.exchange));
    const results = await Promise.allSettled(
      apiSymbols.map((t) => fetchStockPrice(t))
    );
    const newPrices: Record<string, number> = { ...livePrices };
    let fetched = 0;
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value.ok) {
        newPrices[apiSymbols[i]] = r.value.quote.price;
        fetched++;
      }
    });
    setLivePrices(newPrices);
    setScenarios((prev) =>
      prev.map((s) => ({
        ...s,
        allocations: s.allocations.map((a) => {
          const key = apiTicker(a.ticker, a.exchange);
          return newPrices[key] != null ? { ...a, buyPrice: newPrices[key] } : a;
        }),
      }))
    );
    setRefreshingAll(false);
    toast.success(`Fetched prices for ${fetched} of ${pairs.length} stocks`);
  }, [holdings, livePrices]);

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
        const h = holdings.find((x) => x.id === a.holdingId);
        if (!h || !a.buyPrice || a.buyPrice <= 0 || a.allocated <= 0) {
          return {
            ...a,
            sharesBought: 0,
            newTotalShares: h?.shares ?? a.currentShares,
            newAvg: h?.avg_cost ?? a.currentAvg,
            reduction: 0,
            reductionPct: 0,
            feeApplied: 0,
            totalSpend: 0,
            budgetInvested: 0,
            currentShares: h?.shares ?? a.currentShares,
            currentAvg: h?.avg_cost ?? a.currentAvg,
          };
        }
        const c = computeWhatIfAllocationRow(h, a.buyPrice, a.allocated, includeFees);
        if (!c) {
          return {
            ...a,
            sharesBought: 0,
            newTotalShares: h.shares,
            newAvg: h.avg_cost,
            reduction: 0,
            reductionPct: 0,
            feeApplied: 0,
            totalSpend: 0,
            budgetInvested: 0,
            currentShares: h.shares,
            currentAvg: h.avg_cost,
          };
        }
        const reduction = h.avg_cost - c.newAvg;
        const reductionPct = h.avg_cost > 0 ? (reduction / h.avg_cost) * 100 : 0;
        return {
          ...a,
          currentShares: h.shares,
          currentAvg: h.avg_cost,
          sharesBought: c.sharesBought,
          newTotalShares: c.newTotalShares,
          newAvg: c.newAvg,
          reduction,
          reductionPct,
          feeApplied: c.feeApplied,
          totalSpend: c.totalSpend,
          budgetInvested: c.budgetInvested,
        };
      });
      const totalAllocated = s.allocations.reduce((sum, a) => sum + a.allocated, 0);
      const totalNewShares = rows.reduce((sum, r) => sum + r.sharesBought, 0);
      const weightedReduction = rows.reduce((sum, r) => sum + r.reduction * r.currentShares, 0);
      const totalWeight = rows.reduce((sum, r) => sum + r.currentShares, 0);
      const avgReduction = totalWeight > 0 ? weightedReduction / totalWeight : 0;
      return { rows, totalAllocated, totalNewShares, avgReduction };
    });
  }, [scenarios, holdings, includeFees]);

  const activeResult = scenarioResults[activeTab];
  const rawUnallocated = budget - (activeResult?.totalAllocated ?? 0);
  const unallocated = Math.round(rawUnallocated * 100) / 100;
  const displayUnallocated = Math.abs(unallocated) < 0.01 ? 0 : unallocated;

  // ── Row selection ──────────────────────────────────────────

  const toggleRow = (idx: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const selectableIndices = useMemo(() => {
    if (!activeResult) return [];
    return activeResult.rows
      .map((r, i) => (r.sharesBought > 0 ? i : -1))
      .filter((i) => i >= 0);
  }, [activeResult]);

  const allSelected = selectableIndices.length > 0 && selectableIndices.every((i) => selectedRows.has(i));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(selectableIndices));
    }
  };

  const selectedCount = selectableIndices.filter((i) => selectedRows.has(i)).length;

  // ── Apply to holdings ──────────────────────────────────────

  const selectedTrades = useMemo(() => {
    if (!activeResult) return [];
    return Array.from(selectedRows)
      .filter((i) => activeResult.rows[i]?.sharesBought > 0)
      .map((i) => {
        const r = activeResult.rows[i];
        return {
          holdingId: r.holdingId,
          ticker: r.ticker,
          exchange: r.exchange,
          allocated: r.allocated,
          sharesBought: r.sharesBought,
          buyPrice: r.buyPrice!,
          newAvg: r.newAvg,
          currentAvg: r.currentAvg,
        };
      });
  }, [activeResult, selectedRows]);

  const handleApplyConfirm = () => {
    try {
      for (const t of selectedTrades) {
        const h = getHolding(t.holdingId);
        if (!h) continue;
        const row = computeWhatIfAllocationRow(h, t.buyPrice, t.allocated, includeFees);
        if (!row || row.sharesBought <= 0) continue;
        applyBuyToHolding({
          holdingId: h.id,
          buyPrice: t.buyPrice,
          sharesBought: row.sharesBought,
          budgetInvested: row.budgetInvested,
          feeApplied: row.feeApplied,
          totalSpend: row.totalSpend,
          includeFees,
          newTotalShares: row.newTotalShares,
          newAvgCost: row.newAvg,
          method: "what_if",
          notes: "What-If scenario apply",
        });
      }
      const now = new Date();
      const label = `Applied on ${now.toLocaleDateString()}`;
      addWhatIfComparison({
        totalBudget: budget,
        scenarios: scenarios.map((s) => ({
          ...s,
          name: `${s.name} — ${label}`,
        })),
      });
      const tickers = selectedTrades.map((t) => t.ticker).join(", ");
      toast.success(`Updated holdings for ${tickers}`);
      setShowApplyDialog(false);
      setSelectedRows(new Set());
      setSavedRefresh((r) => r + 1);
      navigate("/");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Apply failed: ${msg}`);
    }
  };



  // ── Save comparison ────────────────────────────────────────

  const handleSave = () => {
    if (!budget || scenarios.every((s) => s.allocations.every((a) => a.allocated === 0))) {
      toast.error("Add allocations before saving");
      return;
    }
    addWhatIfComparison({ totalBudget: budget, scenarios });
    toast.success("Comparison saved");
    setSavedRefresh((r) => r + 1);
  };

  const handleDeleteSaved = (id: string) => {
    removeWhatIfComparison(id);
    toast.success("Scenario deleted");
    setSavedRefresh((r) => r + 1);
  };

  const computeSavedResults = (comp: WhatIfComparison) => {
    const map = new Map(getHoldings().map((x) => [x.id, x]));
    return comp.scenarios.map((s) => {
      const rows = s.allocations.map((a) => {
        const h = map.get(a.holdingId);
        if (!h || !a.buyPrice || a.buyPrice <= 0 || a.allocated <= 0) {
          return { ...a, sharesBought: 0, newAvg: h?.avg_cost ?? a.currentAvg, reduction: 0, reductionPct: 0, currentShares: h?.shares ?? a.currentShares, currentAvg: h?.avg_cost ?? a.currentAvg };
        }
        const c = computeWhatIfAllocationRow(h, a.buyPrice, a.allocated, includeFees);
        if (!c) {
          return { ...a, sharesBought: 0, newAvg: h.avg_cost, reduction: 0, reductionPct: 0, currentShares: h.shares, currentAvg: h.avg_cost };
        }
        const reduction = h.avg_cost - c.newAvg;
        const reductionPct = h.avg_cost > 0 ? (reduction / h.avg_cost) * 100 : 0;
        return {
          ...a,
          currentShares: h.shares,
          currentAvg: h.avg_cost,
          sharesBought: c.sharesBought,
          newAvg: c.newAvg,
          reduction,
          reductionPct,
        };
      });
      const totalAllocated = s.allocations.reduce((sum, a) => sum + a.allocated, 0);
      const weightedReduction = rows.reduce((sum, r) => sum + r.reduction * r.currentShares, 0);
      const totalWeight = rows.reduce((sum, r) => sum + r.currentShares, 0);
      const avgReduction = totalWeight > 0 ? weightedReduction / totalWeight : 0;
      return { name: s.name, rows, totalAllocated, avgReduction };
    });
  };

  return (
    <div className="relative min-h-[max(884px,100dvh)] overflow-x-hidden bg-stitch-bg pb-28 font-sans text-white antialiased">
      <header className="mb-6 px-4 pt-10 sm:px-6 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="border-stitch-border bg-stitch-pill text-stitch-muted-soft hover:bg-stitch-card hover:text-white"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">What-If Scenarios</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 pb-8 sm:px-6 md:px-8">
        {/* Budget input */}
        <div className="space-y-4 rounded-[32px] border border-stitch-border bg-stitch-card p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="total-budget" className="text-sm font-semibold text-white">
                Total Budget to Allocate
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stitch-muted" />
                <Input
                  id="total-budget"
                  type="number"
                  step="any"
                  placeholder="3000"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  className="border-stitch-border bg-stitch-pill pl-9 font-mono text-lg text-white placeholder:text-stitch-muted/50"
                />
              </div>
            </div>
            <div className="flex items-center gap-1 pt-6">
              <Button
                size="sm"
                variant={inputMode === "dollar" ? "default" : "outline"}
                className={
                  inputMode === "dollar"
                    ? "bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
                    : "border-stitch-border bg-stitch-pill text-stitch-muted-soft hover:bg-stitch-card hover:text-white"
                }
                onClick={() => setInputMode("dollar")}
              >
                <DollarSign className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant={inputMode === "percent" ? "default" : "outline"}
                className={
                  inputMode === "percent"
                    ? "bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
                    : "border-stitch-border bg-stitch-pill text-stitch-muted-soft hover:bg-stitch-card hover:text-white"
                }
                onClick={() => setInputMode("percent")}
              >
                <Percent className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {budget > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-stitch-muted">Unallocated:</span>
              <span className={`font-mono font-semibold ${displayUnallocated < 0 ? "text-destructive" : displayUnallocated === 0 ? "text-stitch-accent" : ""}`}>
                ${fmt(Math.abs(displayUnallocated) < 0.01 ? 0 : displayUnallocated)}
              </span>
              {displayUnallocated === 0 && <Badge variant="default" className="text-xs">Fully allocated</Badge>}
              {displayUnallocated < -0.01 && <Badge variant="destructive" className="text-xs">Over budget</Badge>}
            </div>
          )}

          <div className="flex items-center justify-between rounded-2xl border border-stitch-border bg-stitch-pill px-4 py-3">
            <Label htmlFor="whatif-sim-fees" className="cursor-pointer text-xs text-stitch-muted">
              Include fees in modeled buys (same as portfolio / calculator)
            </Label>
            <Switch id="whatif-sim-fees" checked={includeFees} onCheckedChange={setIncludeFees} />
          </div>
        </div>

        {/* Mixed currency note */}
        {hasMixedCurrency && (
          <p className="text-xs text-stitch-muted bg-stitch-pill/50 rounded-md px-3 py-2 border border-stitch-border">
            Note: Allocations include stocks in both USD and CAD. Totals are shown per currency.
          </p>
        )}

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
                        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-xs hover:bg-white/15"
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

          {/* Quick-fill & Refresh All buttons */}
          <div className="flex items-center gap-2 flex-wrap">
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
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={refreshAllPrices} disabled={refreshingAll}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshingAll ? "animate-spin" : ""}`} />
              {refreshingAll ? "Fetching…" : "Refresh All Prices"}
            </Button>
          </div>

          {/* Allocation rows */}
          <div className="rounded-lg border border-stitch-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stitch-pill text-stitch-muted">
                  <th className="px-3 py-2.5 text-center w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
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
                  const apiSym = apiTicker(alloc.ticker, alloc.exchange);
                  const livePrice = livePrices[apiSym];
                  const isFetching = fetchingTickers.has(alloc.ticker);
                  const cp = currencyPrefix(alloc.exchange);
                  const isRowSelectable = row && row.sharesBought > 0;
                  const isSelected = selectedRows.has(ai);
                  const hLive = holdings.find((x) => x.id === alloc.holdingId);
                  const dispShares = hLive?.shares ?? alloc.currentShares;
                  const dispAvg = hLive?.avg_cost ?? alloc.currentAvg;
                  return (
                    <tr key={alloc.holdingId} className={`border-t border-stitch-border ${!hasBuyPrice ? "opacity-50" : ""} ${isSelected ? "bg-stitch-accent/10" : ""}`}>
                      <td className="px-3 py-2 text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRow(ai)}
                          disabled={!isRowSelectable}
                          aria-label={`Select ${alloc.ticker}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold">{alloc.ticker}</span>
                          <span className="text-[10px] text-stitch-muted/60">
                            {exchangeLabel(alloc.exchange)}
                          </span>
                          {livePrice ? (
                            <span className="text-xs text-stitch-muted font-mono">{cp}{fmt(livePrice)}</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 px-1.5 text-[10px]"
                              disabled={isFetching}
                              onClick={() => fetchPrice(alloc.ticker, alloc.exchange)}
                            >
                              <Zap className={`h-3 w-3 mr-0.5 ${isFetching ? "animate-pulse" : ""}`} />
                              {isFetching ? "…" : "Get Price"}
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(dispShares)}</td>
                      <td className="px-3 py-2 text-right font-mono">{cp}{fmt(dispAvg)}</td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          step="any"
                          placeholder={livePrice ? `${livePrice.toFixed(2)}` : "Price"}
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
                          <span className="text-xs text-stitch-muted italic">
                            {livePrice ? "Enter price" : "Fetch price or enter manually"}
                          </span>
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
                        {row && row.allocated > 0 ? `${cp}${fmt(row.newAvg)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row && row.reduction > 0 ? (
                          <span className="text-stitch-accent font-mono font-semibold">
                            -{cp}{fmt(row.reduction)} ({row.reductionPct.toFixed(1)}%)
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
            <div className="rounded-lg border border-stitch-border bg-stitch-card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stitch-muted mb-3">
                {scenarios[activeTab].name} — Portfolio Impact
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-stitch-muted">Total Allocated</p>
                  <p className="text-lg font-mono font-semibold">${fmt(activeResult.totalAllocated)}</p>
                </div>
                <div>
                  <p className="text-xs text-stitch-muted">New Shares Bought</p>
                  <p className="text-lg font-mono font-semibold">{fmt(activeResult.totalNewShares)}</p>
                </div>
                <div>
                  <p className="text-xs text-stitch-muted">Weighted Avg Reduction</p>
                  <p className="text-lg font-mono font-semibold text-stitch-accent">
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
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stitch-muted">
              Scenario Comparison
            </h2>
            <div className="rounded-lg border border-stitch-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stitch-pill text-stitch-muted">
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
                    const cp = currencyPrefix(h.exchange ?? "US");
                    return (
                      <tr key={h.id} className="border-t border-stitch-border">
                        <td className="px-3 py-2 font-mono font-semibold">
                          {h.ticker}
                          <span className="text-[10px] text-stitch-muted/60 ml-1">{exchangeLabel(h.exchange ?? "US")}</span>
                        </td>
                        {scenarioResults.map((sr, si) => {
                          const row = sr.rows[hi];
                          const isBest = maxReduction > 0 && row && row.reduction === maxReduction;
                          return (
                            <td key={si} className={`px-3 py-2 text-center font-mono ${isBest ? "text-stitch-accent font-semibold" : ""}`}>
                              {row && row.reduction > 0
                                ? `${cp}${fmt(row.newAvg)} (−${row.reductionPct.toFixed(1)}%)`
                                : "—"
                              }
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-stitch-border bg-stitch-pill/50">
                    <td className="px-3 py-2 font-semibold">Portfolio Impact</td>
                    {scenarioResults.map((sr, si) => {
                      const reductions = scenarioResults.map((s) => s.avgReduction);
                      const maxR = Math.max(...reductions);
                      const isBest = maxR > 0 && sr.avgReduction === maxR;
                      return (
                        <td key={si} className={`px-3 py-2 text-center font-mono ${isBest ? "text-stitch-accent font-semibold" : ""}`}>
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

        {/* Selection count + Apply + Save buttons */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {selectedCount > 0 && (
              <>
                <span className="text-sm text-stitch-muted">
                  {selectedCount} of {selectableIndices.length} stocks selected
                </span>
                <Button
                  variant="outline"
                  onClick={() => setShowApplyDialog(true)}
                  className="border-stitch-accent text-stitch-accent hover:bg-stitch-accent/10"
                >
                  <CheckSquare className="mr-1.5 h-4 w-4" />
                  Apply to Holdings
                </Button>
              </>
            )}
          </div>
          <Button onClick={handleSave} disabled={!budget}>
            <Save className="mr-1.5 h-4 w-4" />
            Save Comparison
          </Button>
        </div>

        {/* Apply Confirmation Dialog */}
        <AlertDialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
          <AlertDialogContent className="max-w-lg border-stitch-border bg-stitch-card text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Apply Scenario to Holdings</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>The following changes will be made to your holdings:</p>
                  <div className="rounded-md border border-stitch-border bg-stitch-pill/30 p-3 space-y-2 text-sm">
                    {selectedTrades.map((t) => {
                      const cp = currencyPrefix(t.exchange);
                      return (
                        <div key={t.holdingId} className="font-mono">
                          <span className="font-semibold">{t.ticker}:</span>{" "}
                          +{fmt(t.sharesBought)} shares at {cp}{fmt(t.buyPrice)} →{" "}
                          new avg {cp}{fmt(t.newAvg)}{" "}
                          <span className="text-stitch-muted">(was {cp}{fmt(t.currentAvg)})</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-destructive font-medium">
                    This will update your holdings as if you executed these trades. Each selected line creates its own
                    transaction record on that holding.
                  </p>
                  <p className="text-xs text-stitch-muted leading-relaxed">
                    <strong className="text-stitch-muted">Undo:</strong> there is no single “undo whole batch” action. Each
                    position’s <strong className="text-stitch-muted">History</strong> tab can undo only the{" "}
                    <strong className="text-stitch-muted">most recent</strong> applied buy for that ticker. If you applied
                    multiple lines to the same holding elsewhere, undo in reverse chronological order.
                  </p>
                  <p className="text-xs text-stitch-muted italic">
                    Make sure you have actually executed these trades with your broker before updating your holdings here.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-stitch-border bg-transparent text-white hover:bg-stitch-pill">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleApplyConfirm}>Confirm & Update</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Saved Scenarios */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stitch-muted">
            Recent Scenarios
          </h2>
          {savedComparisons.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stitch-border p-6 text-center">
              <p className="text-sm text-stitch-muted">No saved scenarios yet. Build a comparison above and click Save.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedComparisons.map((comp) => {
                const results = computeSavedResults(comp);
                const bestIdx = results.reduce((best, r, i) => (r.avgReduction > (results[best]?.avgReduction ?? 0) ? i : best), 0);
                const date = new Date(comp.created_at);
                return (
                  <div key={comp.id} className="rounded-lg border border-stitch-border bg-stitch-card p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 text-xs text-stitch-muted">
                        <Clock className="h-3.5 w-3.5" />
                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        <span className="font-mono font-semibold text-white text-sm ml-2">
                          Budget: ${fmt(comp.totalBudget)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteSaved(comp.id)}
                        className="inline-flex h-5 w-5 items-center justify-center rounded text-stitch-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label="Delete scenario"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {results.map((sr, si) => {
                        const isBest = results.length > 1 && si === bestIdx && sr.avgReduction > 0;
                        return (
                          <div
                            key={si}
                            className={`rounded-md border p-3 text-sm space-y-1.5 ${
                              isBest ? "border-stitch-accent bg-stitch-accent/10" : "border-stitch-border bg-stitch-pill/30"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs">{sr.name}</span>
                              {isBest && <Badge variant="default" className="text-[10px] px-1.5 py-0">Best</Badge>}
                            </div>
                            <p className="text-xs text-stitch-muted">
                              Allocated: <span className="font-mono">${fmt(sr.totalAllocated)}</span>
                            </p>
                            <div className="space-y-0.5">
                              {sr.rows.filter((r) => r.allocated > 0).map((r) => {
                                const rcp = currencyPrefix((r as any).exchange ?? "US");
                                return (
                                  <div key={r.holdingId} className="flex justify-between text-xs font-mono">
                                    <span>{r.ticker}: {rcp}{fmt(r.allocated)}</span>
                                    <span className="text-stitch-accent">
                                      {rcp}{fmt(r.newAvg)} (−{r.reductionPct.toFixed(1)}%)
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-xs border-t border-stitch-border pt-1 mt-1">
                              Avg reduction: <span className="font-mono text-stitch-accent font-semibold">−${fmt(sr.avgReduction)}</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-stitch-muted text-center pb-6">
          This tool shows mathematical projections only. It is not financial advice. Always do your own research before making investment decisions.
        </p>
      </main>
    </div>
  );
}
