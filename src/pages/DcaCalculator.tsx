import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, Info, Save, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getHolding, addScenario, currencyPrefix, apiTicker } from "@/lib/storage";
import { fetchStockPrice, getCachedQuote } from "@/lib/stock-price";
import { canLookup } from "@/lib/pro";
import { useToast } from "@/hooks/use-toast";

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toFixed(0);
}

type Method = "price_shares" | "price_budget" | "price_target" | "budget_target";

const METHOD_OPTIONS: { value: Method; label: string }[] = [
  { value: "price_shares", label: "Price + Shares" },
  { value: "price_budget", label: "Price + Budget (Recommended target)" },
  { value: "price_target", label: "Price + Target Avg" },
  { value: "budget_target", label: "Budget + Target Avg" },
];

const FIELD_CONFIG: Record<Method, [{ key: string; label: string }, { key: string; label: string }]> = {
  price_shares: [
    { key: "buyPrice", label: "Buy price" },
    { key: "sharesToBuy", label: "Shares to buy" },
  ],
  price_budget: [
    { key: "buyPrice", label: "Buy price" },
    { key: "budget", label: "Max budget (shares only, excl. fee)" },
  ],
  price_target: [
    { key: "buyPrice", label: "Buy price" },
    { key: "targetAvg", label: "Target average cost" },
  ],
  budget_target: [
    { key: "budget", label: "Budget (shares only, excl. fee)" },
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

export default function DcaCalculator() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>("price_shares");
  const [val1, setVal1] = useState("");
  const [val2, setVal2] = useState("");
  const [includeFees, setIncludeFees] = useState(true);
  const [budgetPercent, setBudgetPercent] = useState(100);
  const [tick, setTick] = useState(0);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const { toast } = useToast();

  const input1IsPrice = method !== "budget_target";

  const holding = id ? getHolding(id) : undefined;
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-5">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Holdings
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            DCA Calculator —{" "}
            <span className="text-primary font-mono">{holding.ticker}</span>
            <span className="text-xs font-medium text-muted-foreground ml-2 bg-muted px-2 py-0.5 rounded-full">
              {exLabel}
            </span>
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Current holding stats */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Ticker" value={holding.ticker} />
            <Stat label="Shares (S)" value={S.toFixed(4)} />
            <Stat label="Avg Cost (A)" value={`${cp}${A.toFixed(2)}`} />
            <Stat label={`Fee (${holding.fee_type})`} value={feeLabel} />
          </div>
          {/* Today's Trading row */}
          {(() => {
            const q = getCachedQuote(apiTicker(holding.ticker, exchange).toUpperCase());
            if (!q || q.todayOpen == null) return null;
            return (
              <p className="text-xs text-muted-foreground font-mono mt-3 pt-3 border-t border-border">
                Open: {cp}{q.todayOpen.toFixed(2)}
                {q.todayLow != null && <> · Low: {cp}{q.todayLow.toFixed(2)}</>}
                {q.todayHigh != null && <> · High: {cp}{q.todayHigh.toFixed(2)}</>}
                {q.todayVolume != null && <> · Vol: {formatVolume(q.todayVolume)}</>}
              </p>
            );
          })()}
        </div>

        {/* Method + Inputs */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-5">
          <div className="space-y-2">
            <Label>Method</Label>
            <Select value={method} onValueChange={handleMethodChange}>
              <SelectTrigger className="w-full sm:w-80 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {METHOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="input1">{fields[0].label}</Label>
                {input1IsPrice && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    disabled={fetchingPrice || !canLookup()}
                    onClick={handleUseCurrentPrice}
                  >
                    <Zap className={`mr-1 h-3 w-3 ${fetchingPrice ? "animate-pulse" : ""}`} />
                    Use current price
                  </Button>
                )}
              </div>
              <Input id="input1" type="number" step="any" placeholder="0" value={val1} onChange={(e) => setVal1(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="input2">{fields[1].label}</Label>
              <Input id="input2" type="number" step="any" placeholder="0" value={val2} onChange={(e) => setVal2(e.target.value)} />
            </div>
          </div>

          {isPriceBudget && (
            <div className="space-y-3">
              <Label>Use % of max budget: {budgetPercent}%</Label>
              <Slider min={25} max={100} step={25} value={[budgetPercent]} onValueChange={(v) => setBudgetPercent(v[0])} />
              <div className="flex justify-between text-xs text-muted-foreground">
                {SLIDER_STEPS.map((s) => (
                  <span key={s} className={budgetPercent === s ? "text-primary font-semibold" : ""}>{s}%</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Switch id="include-fees" checked={includeFees} onCheckedChange={setIncludeFees} />
            <Label htmlFor="include-fees" className="cursor-pointer">Include fees in calculation</Label>
          </div>
        </div>

        {isError && (() => {
          const err = result as ResultErr;
          return err.level === "error" ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {err.error}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4 shrink-0" />
              {err.error}
            </p>
          );
        })()}

        {/* Results */}
        <div className={`rounded-lg border border-border bg-card p-6 transition-opacity ${isValid ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Results</h2>
          {isValid ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {isPriceBudget && <Stat label="Achievable Target Avg Cost" value={`${cp}${(result as ResultOk).newAvg.toFixed(2)}`} highlight />}
                <Stat label="Shares to Buy" value={(result as ResultOk).x.toFixed(4)} />
                <Stat label="Budget Invested" value={`${cp}${(result as ResultOk).budget.toFixed(2)}`} />
                <Stat label="Fee Applied" value={`${cp}${(result as ResultOk).feeApplied.toFixed(2)}`} />
                <Stat label="Total Spend" value={`${cp}${(result as ResultOk).totalSpend.toFixed(2)}`} />
                <Stat label="New Total Shares" value={(result as ResultOk).totalShares.toFixed(4)} />
                {!isPriceBudget && <Stat label="New Avg Cost" value={`${cp}${(result as ResultOk).newAvg.toFixed(2)}`} highlight />}
                {(result as ResultOk).effectivePrice !== null && <Stat label="Effective Buy Price" value={`${cp}${(result as ResultOk).effectivePrice!.toFixed(2)}`} />}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {hasInputs ? "Adjust inputs to see results." : "Enter values above to see results."}
            </p>
          )}
          {isValid && (
            <div className="mt-5 flex justify-end gap-2">
              {isPriceBudget && (
                <Button variant="outline" size="sm" onClick={handleUseAsTarget}>
                  <Target className="mr-1.5 h-4 w-4" />
                  Use as target
                </Button>
              )}
              <Button onClick={handleSave} size="sm">
                <Save className="mr-1.5 h-4 w-4" />
                Save scenario
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-mono font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
