import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchHolding } from "@/lib/supabase-holdings";

type Method = "price_shares" | "price_budget" | "price_target" | "budget_target";

const METHOD_OPTIONS: { value: Method; label: string }[] = [
  { value: "price_shares", label: "Price + Shares" },
  { value: "price_budget", label: "Price + Budget" },
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
    { key: "budget", label: "Budget (shares only, excl. fee)" },
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

type ResultOk = {
  ok: true;
  x: number;
  bTotal: number;
  totalShares: number;
  newAvg: number;
  effectivePrice: number | null;
};
type ResultErr = { ok: false; error: string; level: "error" | "info" };
type Result = ResultOk | ResultErr;

function compute(method: Method, S: number, A: number, f: number, i1: number, i2: number): Result {
  switch (method) {
    case "price_shares": {
      const p = i1, x = i2;
      if (p <= 0 || x <= 0) return { ok: false, error: "Values must be positive", level: "error" };
      const bTotal = x * p + f;
      const newAvg = (S * A + x * p + f) / (S + x);
      return { ok: true, x, bTotal, totalShares: S + x, newAvg, effectivePrice: null };
    }
    case "price_budget": {
      const p = i1, B = i2;
      if (p <= 0 || B <= 0) return { ok: false, error: "Values must be positive", level: "error" };
      const x = B / p;
      const newAvg = (S * A + B + f) / (S + x);
      return { ok: true, x, bTotal: B + f, totalShares: S + x, newAvg, effectivePrice: null };
    }
    case "price_target": {
      const p = i1, t = i2;
      if (p <= 0 || t <= 0) return { ok: false, error: "Values must be positive", level: "error" };
      if (t >= A) return { ok: false, error: "Target is already at/above current average", level: "info" };
      if (p >= t) return { ok: false, error: "Cannot reach target when buy price is ≥ target", level: "error" };
      const den = t - p;
      if (den <= 0) return { ok: false, error: "Invalid inputs", level: "error" };
      const x = (S * (A - t) + f) / den;
      if (x <= 0) return { ok: false, error: "Invalid inputs", level: "error" };
      const bTotal = x * p + f;
      const newAvg = (S * A + x * p + f) / (S + x);
      return { ok: true, x, bTotal, totalShares: S + x, newAvg, effectivePrice: null };
    }
    case "budget_target": {
      const B = i1, t = i2;
      if (B <= 0 || t <= 0) return { ok: false, error: "Values must be positive", level: "error" };
      if (t >= A) return { ok: false, error: "Target is already at/above current average", level: "info" };
      const den = S * (A - t) + f;
      if (den <= 0) return { ok: false, error: "Invalid inputs", level: "error" };
      const p = (t * B) / den;
      if (p <= 0) return { ok: false, error: "Invalid inputs", level: "error" };
      const x = B / p;
      const newAvg = (S * A + B + f) / (S + x);
      return { ok: true, x, bTotal: B + f, totalShares: S + x, newAvg, effectivePrice: p };
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

  const { data: holding, isLoading } = useQuery({
    queryKey: ["holding", id],
    queryFn: () => fetchHolding(id!),
    enabled: !!id,
  });

  const fields = FIELD_CONFIG[method];

  const result = useMemo(() => {
    if (!holding) return null;
    const n1 = parseFloat(val1);
    const n2 = parseFloat(val2);
    if (isNaN(n1) || isNaN(n2)) return null;
    const fee = includeFees ? Number(holding.fee) : 0;
    return compute(method, Number(holding.shares), Number(holding.avg_cost), fee, n1, n2);
  }, [method, val1, val2, holding, includeFees]);

  const handleMethodChange = (v: Method) => {
    setMethod(v);
    setVal1("");
    setVal2("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!holding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Holding not found.</p>
      </div>
    );
  }

  const S = Number(holding.shares);
  const A = Number(holding.avg_cost);
  const f = Number(holding.fee);

  const hasInputs = val1 !== "" && val2 !== "";
  const isError = result !== null && !result.ok;
  const isValid = result !== null && result.ok === true;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-5">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Holdings
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            DCA Calculator —{" "}
            <span className="text-primary font-mono">{holding.ticker}</span>
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Current holding stats */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Ticker" value={holding.ticker} />
            <Stat label="Shares (S)" value={S.toFixed(4)} />
            <Stat label="Avg Cost (A)" value={`$${A.toFixed(2)}`} />
            <Stat label="Fee (f)" value={`$${f.toFixed(2)}`} />
          </div>
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
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="input1">{fields[0].label}</Label>
              <Input
                id="input1"
                type="number"
                step="any"
                placeholder="0"
                value={val1}
                onChange={(e) => setVal1(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="input2">{fields[1].label}</Label>
              <Input
                id="input2"
                type="number"
                step="any"
                placeholder="0"
                value={val2}
                onChange={(e) => setVal2(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="include-fees"
              checked={includeFees}
              onCheckedChange={setIncludeFees}
            />
            <Label htmlFor="include-fees" className="cursor-pointer">
              Include fees in calculation
            </Label>
          </div>
        </div>

        {/* Inline guardrail message */}
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
        <div
          className={`rounded-lg border border-border bg-card p-6 transition-opacity ${
            isValid ? "opacity-100" : "opacity-40 pointer-events-none"
          }`}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Results
          </h2>
          {isValid ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Stat label="Shares to Buy" value={(result as ResultOk).x.toFixed(4)} />
              <Stat label="Est. Total Spend (incl. fee)" value={`$${(result as ResultOk).bTotal.toFixed(2)}`} />
              <Stat label="New Total Shares" value={(result as ResultOk).totalShares.toFixed(4)} />
              <Stat label="New Avg Cost" value={`$${(result as ResultOk).newAvg.toFixed(2)}`} highlight />
              {(result as ResultOk).effectivePrice !== null && (
                <Stat label="Effective Buy Price" value={`$${(result as ResultOk).effectivePrice!.toFixed(2)}`} />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {hasInputs ? "Adjust inputs to see results." : "Enter values above to see results."}
            </p>
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
      <p className={`text-lg font-mono font-semibold ${highlight ? "text-primary" : ""}`}>
        {value}
      </p>
    </div>
  );
}
