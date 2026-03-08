import { useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, AlertCircle, Info, Save, Target, Zap, CheckCircle, TrendingDown, TrendingUp, Minus } from "lucide-react";
import SavedScenarios from "@/components/SavedScenarios";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getHolding, addScenario, currencyPrefix, apiTicker, applyBuyToHolding, type Scenario } from "@/lib/storage";
import { fetchStockPrice, getCachedQuote } from "@/lib/stock-price";
import { canLookup } from "@/lib/pro";
import { useToast } from "@/hooks/use-toast";

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toFixed(0);
}

const fmt2 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt4 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

type Method = "price_shares" | "price_budget" | "price_target" | "budget_target";

const METHOD_OPTIONS: { value: Method; label: string; desc: string }[] = [
  { value: "price_shares", label: "Price + Shares", desc: "Set buy price & share count" },
  { value: "price_budget", label: "Price + Budget", desc: "Recommended target workflow" },
  { value: "price_target", label: "Price + Target Avg", desc: "Target a specific average" },
  { value: "budget_target", label: "Budget + Target Avg", desc: "Fixed budget, target avg" },
];

const FIELD_CONFIG: Record<Method, [{ key: string; label: string }, { key: string; label: string }]> = {
  price_shares: [
    { key: "buyPrice", label: "Buy price" },
    { key: "sharesToBuy", label: "Shares to buy" },
  ],
  price_budget: [
    { key: "buyPrice", label: "Buy price" },
    { key: "budget", label: "Max budget (excl. fee)" },
  ],
  price_target: [
    { key: "buyPrice", label: "Buy price" },
    { key: "targetAvg", label: "Target average cost" },
  ],
  budget_target: [
    { key: "budget", label: "Budget (excl. fee)" },
    { key: "targetAvg", label: "Target average cost" },
  ],
};

const SLIDER_STEPS = [25, 50, 75, 100];

type ResultOk = {
  ok: true;
  x: number;
  budget: number;
  feeApplied: number;
  totalSpend: number;
  totalShares: number;
  newAvg: number;
  effectivePrice: number | null;
};
type ResultErr = { ok: false; error: string; level: "error" | "info" };
type Result = ResultOk | ResultErr;

function computeFee(feeType: string, feeValue: number, B: number): number {
  if (feeType === "percent") return B * (feeValue / 100);
  return feeValue;
}

function compute(
  method: Method, S: number, A: number,
  feeType: string, feeValue: number, includeFees: boolean,
  i1: number, i2: number
): Result {
  switch (method) {
    case "price_shares": {
      const p = i1, x = i2;
      if (p <= 0 || x <= 0) return { ok: false, error: "Values must be positive", level: "error" };
      const B = x * p;
      const f = includeFees ? computeFee(feeType, feeValue, B) : 0;
      const newAvg = (S * A + B + f) / (S + x);
      return { ok: true, x, budget: B, feeApplied: f, totalSpend: B + f, totalShares: S + x, newAvg, effectivePrice: null };
    }
    case "price_budget": {
      const p = i1, B = i2;
      if (p <= 0 || B <= 0) return { ok: false, error: "Values must be positive", level: "error" };
      const x = B / p;
      const f = includeFees ? computeFee(feeType, feeValue, B) : 0;
      const newAvg = (S * A + B + f) / (S + x);
      return { ok: true, x, budget: B, feeApplied: f, totalSpend: B + f, totalShares: S + x, newAvg, effectivePrice: null };
    }
    case "price_target": {
      const p = i1, t = i2;
      if (p <= 0 || t <= 0) return { ok: false, error: "Values must be positive", level: "error" };
      if (t >= A) return { ok: false, error: "Target is already at/above current average", level: "info" };
      if (p >= t) return { ok: false, error: "Cannot reach target when buy price is ≥ target", level: "error" };
      if (feeType === "percent" && includeFees) {
        const r = feeValue / 100;
        const numB = S * (t - A);
        const denB = 1 + r - t / p;
        if (denB === 0) return { ok: false, error: "Invalid inputs", level: "error" };
        const B = numB / denB;
        if (B <= 0) return { ok: false, error: "Invalid inputs", level: "error" };
        const x = B / p;
        const f = computeFee(feeType, feeValue, B);
        const newAvg = (S * A + B + f) / (S + x);
        return { ok: true, x, budget: B, feeApplied: f, totalSpend: B + f, totalShares: S + x, newAvg, effectivePrice: null };
      } else {
        const f = includeFees ? computeFee(feeType, feeValue, 0) : 0;
        const den = t - p;
        if (den <= 0) return { ok: false, error: "Invalid inputs", level: "error" };
        const x = (S * (A - t) + f) / den;
        if (x <= 0) return { ok: false, error: "Invalid inputs", level: "error" };
        const B = x * p;
        const newAvg = (S * A + B + f) / (S + x);
        return { ok: true, x, budget: B, feeApplied: f, totalSpend: B + f, totalShares: S + x, newAvg, effectivePrice: null };
      }
    }
    case "budget_target": {
      const B = i1, t = i2;
      if (B <= 0 || t <= 0) return { ok: false, error: "Values must be positive", level: "error" };
      if (t >= A) return { ok: false, error: "Target is already at/above current average", level: "info" };
      const f = includeFees ? computeFee(feeType, feeValue, B) : 0;
      const den = S * (A - t) + B + f;
      if (den <= 0) return { ok: false, error: "Invalid inputs", level: "error" };
      const p = (t * B) / den;
      if (p <= 0) return { ok: false, error: "Invalid inputs", level: "error" };
      const x = B / p;
      const newAvg = (S * A + B + f) / (S + x);
      return { ok: true, x, budget: B, feeApplied: f, totalSpend: B + f, totalShares: S + x, newAvg, effectivePrice: p };
    }
  }
}

// Preset chips per method
function getPresets(method: Method, field: 1 | 2): { label: string; value: string }[] {
  if (method === "price_shares" && field === 2) {
    return [
      { label: "+10", value: "10" },
      { label: "+25", value: "25" },
      { label: "+50", value: "50" },
      { label: "+100", value: "100" },
    ];
  }
  if ((method === "price_budget" || method === "budget_target") && field === (method === "price_budget" ? 2 : 1)) {
    return [
      { label: "$250", value: "250" },
      { label: "$500", value: "500" },
      { label: "$1,000", value: "1000" },
      { label: "$2,500", value: "2500" },
    ];
  }
  return [];
}

export default function DcaCalculator() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [method, setMethod] = useState<Method>(() => {
    const m = searchParams.get("method");
    return (m && ["price_shares", "price_budget", "price_target", "budget_target"].includes(m))
      ? m as Method : "price_shares";
  });
  const [val1, setVal1] = useState(() => searchParams.get("val1") || "");
  const [val2, setVal2] = useState(() => searchParams.get("val2") || "");
  const [includeFees, setIncludeFees] = useState(true);
  const [budgetPercent, setBudgetPercent] = useState(100);
  const [tick, setTick] = useState(0);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [scenarioToApply, setScenarioToApply] = useState<Scenario | null>(null);
  const [holdingVersion, setHoldingVersion] = useState(0);
  const { toast } = useToast();

  const input1IsPrice = method !== "budget_target";

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const holding = useMemo(() => (id ? getHolding(id) : undefined), [id, holdingVersion]);
  const exchange = holding?.exchange ?? "US";
  const cp = currencyPrefix(exchange);

  const handleUseCurrentPrice = async () => {
    if (!holding) return;
    setFetchingPrice(true);
    const result = await fetchStockPrice(apiTicker(holding.ticker, exchange));
    setFetchingPrice(false);
    if (result.ok) {
      setVal1(String(result.quote.price));
    } else {
      toast({ title: "Price unavailable", description: "Could not fetch price", variant: "destructive" });
    }
  };

  const fields = FIELD_CONFIG[method];

  const effectiveVal2 = useMemo(() => {
    if (method === "price_budget" && val2 !== "") {
      const maxB = parseFloat(val2);
      if (!isNaN(maxB)) return String(maxB * (budgetPercent / 100));
    }
    return val2;
  }, [method, val2, budgetPercent]);

  const result = useMemo(() => {
    if (!holding) return null;
    const n1 = parseFloat(val1);
    const n2 = parseFloat(method === "price_budget" ? effectiveVal2 : val2);
    if (isNaN(n1) || isNaN(n2)) return null;
    return compute(method, Number(holding.shares), Number(holding.avg_cost), holding.fee_type, Number(holding.fee_value), includeFees, n1, n2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, val1, val2, effectiveVal2, holding, includeFees, tick]);

  const handleMethodChange = (v: Method) => {
    setMethod(v);
    setVal1("");
    setVal2("");
    setBudgetPercent(100);
  };

  const handleUseAsTarget = () => {
    if (!result || !result.ok) return;
    const currentPrice = val1;
    setMethod("price_target");
    setVal1(currentPrice);
    setVal2(String((result as ResultOk).newAvg));
    setBudgetPercent(100);
  };

  const handleSave = () => {
    if (!holding || !result || !result.ok) return;
    const r = result as ResultOk;
    const flds = FIELD_CONFIG[method];
    const n1 = parseFloat(val1);
    const n2 = parseFloat(val2);

    let buyPrice: number | null = null;
    if (method === "price_shares" || method === "price_budget" || method === "price_target") {
      buyPrice = n1;
    } else if (method === "budget_target" && r.effectivePrice !== null) {
      buyPrice = r.effectivePrice;
    }

    const isRecommended = method === "price_budget";

    addScenario({
      holding_id: holding.id,
      ticker: holding.ticker,
      method,
      input1_label: flds[0].label,
      input1_value: n1,
      input2_label: flds[1].label,
      input2_value: n2,
      include_fees: includeFees,
      fee_amount: r.feeApplied,
      buy_price: buyPrice,
      shares_to_buy: r.x,
      budget_invested: r.budget,
      fee_applied: r.feeApplied,
      total_spend: r.totalSpend,
      new_total_shares: r.totalShares,
      new_avg_cost: r.newAvg,
      recommended_target: isRecommended ? r.newAvg : null,
      budget_percent_used: isRecommended ? budgetPercent : null,
      notes: null,
    });

    toast({ title: "Scenario saved" });
    setVal1("");
    setVal2("");
    setBudgetPercent(100);
    setTick((t) => t + 1);
  };

  const getBuyPrice = (): number => {
    if (!result || !result.ok) return 0;
    const r = result as ResultOk;
    const n1 = parseFloat(val1);
    if (method === "budget_target" && r.effectivePrice !== null) return r.effectivePrice;
    return n1;
  };

  const handleApplyBuy = () => {
    if (!holding || !result || !result.ok || applying) return;
    setShowApplyConfirm(true);
  };

  const confirmApplyBuy = () => {
    if (!holding || !result || !result.ok || applying) return;
    const r = result as ResultOk;
    setApplying(true);
    setShowApplyConfirm(false);
    try {
      applyBuyToHolding({
        holdingId: holding.id,
        buyPrice: getBuyPrice(),
        sharesBought: r.x,
        budgetInvested: r.budget,
        feeApplied: r.feeApplied,
        totalSpend: r.totalSpend,
        includeFees: includeFees,
        newTotalShares: r.totalShares,
        newAvgCost: r.newAvg,
        method,
      });
      toast({ title: "Buy applied successfully" });
      setVal1("");
      setVal2("");
      setBudgetPercent(100);
      setHoldingVersion((v) => v + 1);
      setTick((t) => t + 1);
    } catch (e: any) {
      toast({ title: "Failed to apply buy", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  if (!holding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Holding not found.</p>
      </div>
    );
  }

  const S = Number(holding.shares);
  const A = Number(holding.avg_cost);
  const feeLabel = holding.fee_type === "percent" ? `${holding.fee_value}%` : `${cp}${Number(holding.fee_value).toFixed(2)}`;
  const exLabel = exchange === "TSX" ? "TSX" : "US";

  const hasInputs = val1 !== "" && val2 !== "";
  const isError = result !== null && !result.ok;
  const isValid = result !== null && result.ok === true;
  const isPriceBudget = method === "price_budget";

  // Market data
  const quote = getCachedQuote(apiTicker(holding.ticker, exchange).toUpperCase());
  const marketPrice = quote?.price ?? null;
  const marketValue = marketPrice != null ? S * marketPrice : null;
  const costBasis = S * A;
  const unrealizedPL = marketValue != null ? marketValue - costBasis : null;
  const unrealizedPct = unrealizedPL != null && costBasis > 0 ? (unrealizedPL / costBasis) * 100 : null;

  // Result comparison
  const r = isValid ? (result as ResultOk) : null;
  const avgDiff = r ? A - r.newAvg : 0;
  const avgImproves = avgDiff > 0.005;
  const avgWorsens = avgDiff < -0.005;

  const presets1 = getPresets(method, 1);
  const presets2 = getPresets(method, 2);

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 sm:px-6 py-3">
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate">
              <span className="text-primary font-mono">{holding.ticker}</span>
              <span className="text-muted-foreground font-normal ml-1.5 text-sm">DCA Planner</span>
            </h1>
            <Badge variant="outline" className="text-[10px] px-1.5 h-5 shrink-0">{exLabel}</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6">
        {/* Position Overview */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Position Overview</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <MiniStat label="Shares" value={fmt4(S)} />
            <MiniStat label="Avg Cost" value={`${cp}${fmt2(A)}`} accent />
            <MiniStat label="Cost Basis" value={`${cp}${fmt2(costBasis)}`} />
            {marketPrice != null && (
              <MiniStat label="Market Price" value={`${cp}${fmt2(marketPrice)}`} />
            )}
            {marketValue != null && (
              <MiniStat label="Market Value" value={`${cp}${fmt2(marketValue)}`} />
            )}
            {unrealizedPL != null && (
              <MiniStat
                label="Unrealized P/L"
                value={`${unrealizedPL >= 0 ? "+" : ""}${cp}${fmt2(unrealizedPL)}`}
                sub={unrealizedPct != null ? `${unrealizedPct >= 0 ? "+" : ""}${unrealizedPct.toFixed(1)}%` : undefined}
                positive={unrealizedPL >= 0}
                negative={unrealizedPL < 0}
              />
            )}
          </div>
          {/* Trading data */}
          {quote && quote.todayOpen != null && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-mono mt-3 pt-3 border-t border-border">
              <span>Open {cp}{quote.todayOpen.toFixed(2)}</span>
              {quote.todayLow != null && <span>Low {cp}{quote.todayLow.toFixed(2)}</span>}
              {quote.todayHigh != null && <span>High {cp}{quote.todayHigh.toFixed(2)}</span>}
              {quote.todayVolume != null && <span>Vol {formatVolume(quote.todayVolume)}</span>}
              <span>Fee {feeLabel}</span>
            </div>
          )}
          {(!quote || quote.todayOpen == null) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-mono mt-3 pt-3 border-t border-border">
              <span>Fee: {feeLabel} ({holding.fee_type})</span>
            </div>
          )}
        </div>

        {/* 2-column calculator layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left: Inputs */}
          <div className="lg:col-span-3 space-y-4">
            {/* Method selector */}
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Method</Label>
                <Select value={method} onValueChange={handleMethodChange}>
                  <SelectTrigger className="w-full bg-background h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {METHOD_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="font-medium">{o.label}</span>
                        <span className="text-muted-foreground ml-1.5 text-xs hidden sm:inline">— {o.desc}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Input fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Field 1 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="input1" className="text-xs text-muted-foreground">{fields[0].label}</Label>
                    {input1IsPrice && (
                      <button
                        type="button"
                        className="text-[11px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors disabled:opacity-40"
                        disabled={fetchingPrice || !canLookup()}
                        onClick={handleUseCurrentPrice}
                      >
                        <Zap className={`h-3 w-3 ${fetchingPrice ? "animate-pulse" : ""}`} />
                        Live price
                      </button>
                    )}
                  </div>
                  <Input
                    id="input1"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={val1}
                    onChange={(e) => setVal1(e.target.value)}
                    className="h-9 font-mono text-sm bg-background"
                  />
                  {presets1.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {presets1.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setVal1(p.value)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Field 2 */}
                <div className="space-y-1.5">
                  <Label htmlFor="input2" className="text-xs text-muted-foreground">{fields[1].label}</Label>
                  <Input
                    id="input2"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={val2}
                    onChange={(e) => setVal2(e.target.value)}
                    className="h-9 font-mono text-sm bg-background"
                  />
                  {presets2.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {presets2.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setVal2(p.value)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Budget slider */}
              {isPriceBudget && (
                <div className="space-y-2 pt-1">
                  <Label className="text-xs text-muted-foreground">Budget allocation: <span className="text-foreground font-semibold">{budgetPercent}%</span></Label>
                  <Slider min={25} max={100} step={25} value={[budgetPercent]} onValueChange={(v) => setBudgetPercent(v[0])} />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    {SLIDER_STEPS.map((s) => (
                      <span key={s} className={budgetPercent === s ? "text-primary font-bold" : ""}>{s}%</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Fee toggle */}
              <div className="flex items-center gap-2.5 pt-1">
                <Switch id="include-fees" checked={includeFees} onCheckedChange={setIncludeFees} className="scale-90" />
                <Label htmlFor="include-fees" className="cursor-pointer text-xs text-muted-foreground">Include fees</Label>
              </div>
            </div>

            {/* Error display */}
            {isError && (() => {
              const err = result as ResultErr;
              return err.level === "error" ? (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {err.error}
                </div>
              ) : (
                <p className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  {err.error}
                </p>
              );
            })()}
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-2">
            <div className={`rounded-xl border bg-card transition-all sticky top-16 ${isValid ? "border-primary/20" : "border-border opacity-50"}`}>
              {/* Results header */}
              <div className="p-4 sm:p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                  {isValid ? "Projected Outcome" : "Results"}
                </h2>

                {isValid && r ? (
                  <div className="space-y-4">
                    {/* Hero metric: New Avg */}
                    <div className="text-center pb-3 border-b border-border">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                        {isPriceBudget ? "Achievable Target" : "New Average Cost"}
                      </p>
                      <p className="text-3xl font-mono font-bold text-primary leading-none">
                        {cp}{fmt2(r.newAvg)}
                      </p>
                      {/* Comparison vs current avg */}
                      <div className="flex items-center justify-center gap-1.5 mt-2">
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Current {cp}{fmt2(A)}
                        </span>
                        <span className="text-[11px] mx-0.5">→</span>
                        {avgImproves ? (
                          <span className="text-[11px] font-medium text-primary flex items-center gap-0.5">
                            <TrendingDown className="h-3 w-3" />
                            −{cp}{fmt2(Math.abs(avgDiff))}/share
                          </span>
                        ) : avgWorsens ? (
                          <span className="text-[11px] font-medium text-destructive flex items-center gap-0.5">
                            <TrendingUp className="h-3 w-3" />
                            +{cp}{fmt2(Math.abs(avgDiff))}/share
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-0.5">
                            <Minus className="h-3 w-3" />
                            No change
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Detail grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                      <ResultRow label="Shares to buy" value={fmt4(r.x)} />
                      <ResultRow label="Budget invested" value={`${cp}${fmt2(r.budget)}`} />
                      <ResultRow label="Fee applied" value={`${cp}${fmt2(r.feeApplied)}`} />
                      <ResultRow label="Total spend" value={`${cp}${fmt2(r.totalSpend)}`} />
                      <ResultRow label="New total shares" value={fmt4(r.totalShares)} />
                      {r.effectivePrice !== null && (
                        <ResultRow label="Eff. buy price" value={`${cp}${fmt2(r.effectivePrice)}`} />
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-border">
                      {isPriceBudget && (
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={handleUseAsTarget}>
                          <Target className="mr-1.5 h-3.5 w-3.5" />
                          Use as target
                        </Button>
                      )}
                      <div className="flex gap-2">
                        <Button onClick={handleSave} size="sm" variant="outline" className="flex-1 h-8 text-xs">
                          <Save className="mr-1.5 h-3.5 w-3.5" />
                          Save
                        </Button>
                        <Button onClick={handleApplyBuy} size="sm" disabled={applying} className="flex-1 h-8 text-xs">
                          <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                          {applying ? "Applying…" : "Apply Buy"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs text-muted-foreground">
                      {hasInputs ? "Adjust inputs to see results." : "Enter values to see projected outcome."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky bottom bar on valid result */}
        {isValid && r && (
          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur-sm lg:hidden">
            <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-2.5 gap-3">
              <div className="flex items-center gap-4 min-w-0">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">New Avg</p>
                  <p className="text-sm font-mono font-bold text-primary">{cp}{fmt2(r.newAvg)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Spend</p>
                  <p className="text-sm font-mono font-semibold">{cp}{fmt2(r.totalSpend)}</p>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button onClick={handleSave} size="sm" variant="outline" className="h-7 text-[11px] px-2.5">
                  <Save className="h-3 w-3" />
                </Button>
                <Button onClick={handleApplyBuy} size="sm" disabled={applying} className="h-7 text-[11px] px-2.5">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Apply
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Apply confirmation dialog */}
        <AlertDialog open={showApplyConfirm} onOpenChange={setShowApplyConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apply this buy to {holding.ticker}?</AlertDialogTitle>
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

        {/* Saved Scenarios */}
        <SavedScenarios
          holdingId={holding.id}
          exchange={exchange as any}
          refreshKey={tick}
          currentAvg={A}
          currencyPrefix={cp}
          onUseScenario={(s: Scenario) => {
            const m = s.method as any;
            setMethod(m);
            setVal1(String(s.input1_value));
            setVal2(String(s.input2_value));
            if (s.budget_percent_used != null) setBudgetPercent(s.budget_percent_used);
            setIncludeFees(s.include_fees);
          }}
        />
      </main>
    </div>
  );
}

function MiniStat({ label, value, accent, sub, positive, negative }: {
  label: string; value: string; accent?: boolean; sub?: string; positive?: boolean; negative?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-mono font-semibold leading-tight ${
        accent ? "text-primary" : positive ? "text-primary" : negative ? "text-destructive" : ""
      }`}>
        {value}
      </p>
      {sub && (
        <p className={`text-[10px] font-mono ${positive ? "text-primary" : negative ? "text-destructive" : "text-muted-foreground"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-xs font-mono font-medium tabular-nums">{value}</span>
    </div>
  );
}
