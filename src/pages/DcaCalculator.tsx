import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  { value: "price_budget", label: "Price + Budget (total spend incl. fee)" },
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
    { key: "budget", label: "Budget (total spend incl. fee)" },
  ],
  price_target: [
    { key: "buyPrice", label: "Buy price" },
    { key: "targetAvg", label: "Target average cost" },
  ],
  budget_target: [
    { key: "budget", label: "Budget (total spend incl. fee)" },
    { key: "targetAvg", label: "Target average cost" },
  ],
};

function computeResults(
  method: Method,
  S: number,
  A: number,
  f: number,
  input1: number,
  input2: number
) {
  const currentTotalCost = S * A + f;

  switch (method) {
    case "price_shares": {
      const buyPrice = input1;
      const newShares = input2;
      if (buyPrice <= 0 || newShares <= 0) return null;
      const totalShares = S + newShares;
      const newTotalCost = currentTotalCost + newShares * buyPrice;
      const newAvg = newTotalCost / totalShares;
      return { newShares, buyPrice, totalShares, newTotalCost, newAvg };
    }
    case "price_budget": {
      const buyPrice = input1;
      const budget = input2;
      if (buyPrice <= 0 || budget <= 0) return null;
      const newShares = budget / buyPrice;
      const totalShares = S + newShares;
      const newTotalCost = currentTotalCost + budget;
      const newAvg = newTotalCost / totalShares;
      return { newShares, buyPrice, totalShares, newTotalCost, newAvg };
    }
    case "price_target": {
      const buyPrice = input1;
      const targetAvg = input2;
      if (buyPrice <= 0 || targetAvg <= 0 || Math.abs(buyPrice - targetAvg) < 1e-10) return null;
      const newShares = (targetAvg * S - currentTotalCost) / (buyPrice - targetAvg);
      if (newShares <= 0) return null;
      const totalShares = S + newShares;
      const newTotalCost = currentTotalCost + newShares * buyPrice;
      const newAvg = newTotalCost / totalShares;
      return { newShares, buyPrice, totalShares, newTotalCost, newAvg };
    }
    case "budget_target": {
      const budget = input1;
      const targetAvg = input2;
      if (budget <= 0 || targetAvg <= 0) return null;
      const totalShares = (currentTotalCost + budget) / targetAvg;
      const newShares = totalShares - S;
      if (newShares <= 0) return null;
      const buyPrice = budget / newShares;
      const newTotalCost = currentTotalCost + budget;
      const newAvg = newTotalCost / totalShares;
      return { newShares, buyPrice, totalShares, newTotalCost, newAvg };
    }
  }
}

export default function DcaCalculator() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>("price_shares");
  const [val1, setVal1] = useState("");
  const [val2, setVal2] = useState("");

  const { data: holding, isLoading } = useQuery({
    queryKey: ["holding", id],
    queryFn: () => fetchHolding(id!),
    enabled: !!id,
  });

  const fields = FIELD_CONFIG[method];

  const results = useMemo(() => {
    if (!holding) return null;
    const n1 = parseFloat(val1);
    const n2 = parseFloat(val2);
    if (isNaN(n1) || isNaN(n2)) return null;
    return computeResults(
      method,
      Number(holding.shares),
      Number(holding.avg_cost),
      Number(holding.fee),
      n1,
      n2
    );
  }, [method, val1, val2, holding]);

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-5">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
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
            <Stat label="Shares (S)" value={S.toString()} />
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
        </div>

        {/* Results */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Results
          </h2>
          {results ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Stat label="Shares to Buy" value={results.newShares.toFixed(6)} />
              <Stat label="Buy Price" value={`$${results.buyPrice.toFixed(2)}`} />
              <Stat label="Total Shares" value={results.totalShares.toFixed(6)} />
              <Stat label="New Total Cost" value={`$${results.newTotalCost.toFixed(2)}`} />
              <Stat
                label="New Avg Cost"
                value={`$${results.newAvg.toFixed(2)}`}
                highlight
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Enter valid values above to see results.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p
        className={`text-lg font-mono font-semibold ${
          highlight ? "text-primary" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
