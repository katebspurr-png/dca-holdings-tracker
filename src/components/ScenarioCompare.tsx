import { useMemo } from "react";
import { ArrowRight, CheckCircle, Award, DollarSign, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Scenario } from "@/lib/storage";

const METHOD_LABELS: Record<string, string> = {
  price_shares: "Price + Shares",
  price_budget: "Price + Budget",
  price_target: "Price + Target Avg",
  budget_target: "Budget + Target Avg",
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt4 = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

interface Props {
  scenarios: Scenario[];
  currentAvg: number;
  cp: string;
  onUseScenario: (s: Scenario) => void;
  onApplyBuy: (s: Scenario) => void;
}

export default function ScenarioCompare({ scenarios, currentAvg, cp, onUseScenario, onApplyBuy }: Props) {
  const analysis = useMemo(() => {
    const bestAvgId = scenarios.reduce((best, s) => s.new_avg_cost < best.new_avg_cost ? s : best, scenarios[0]).id;
    const lowestSpendId = scenarios.reduce((best, s) => s.total_spend < best.total_spend ? s : best, scenarios[0]).id;
    // Best improvement = largest positive (currentAvg - new_avg_cost)
    const bestImprovementId = scenarios.reduce((best, s) =>
      (currentAvg - s.new_avg_cost) > (currentAvg - best.new_avg_cost) ? s : best, scenarios[0]).id;

    return { bestAvgId, lowestSpendId, bestImprovementId };
  }, [scenarios, currentAvg]);

  return (
    <div className="rounded-xl border border-primary/20 bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-primary/[0.03]">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-primary flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          Scenario Comparison
        </h3>
      </div>

      {/* Columns - horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        <div className="grid min-w-[640px]" style={{ gridTemplateColumns: `repeat(${scenarios.length}, 1fr)` }}>
          {scenarios.map((s, idx) => {
            const avgDiff = currentAvg - s.new_avg_cost;
            const improves = avgDiff > 0.005;
            const worsens = avgDiff < -0.005;
            const efficiency = avgDiff > 0 && s.total_spend > 0 ? avgDiff / s.total_spend : 0;
            const isBestAvg = s.id === analysis.bestAvgId;
            const isLowestSpend = s.id === analysis.lowestSpendId;
            const isBestImprovement = s.id === analysis.bestImprovementId;

            return (
              <div
                key={s.id}
                className={`p-4 space-y-3 ${idx > 0 ? "border-l border-border" : ""}`}
              >
                {/* Header */}
                <div>
                  <p className="text-[11px] font-medium text-foreground/80">
                    {METHOD_LABELS[s.method] ?? s.method}
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 tabular-nums">
                    {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1">
                  {isBestAvg && (
                    <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 gap-0.5 bg-primary/10 text-primary border-0">
                      <Award className="h-2 w-2" /> Lowest modeled avg
                    </Badge>
                  )}
                  {isLowestSpend && (
                    <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 gap-0.5 bg-accent text-accent-foreground border-0">
                      <DollarSign className="h-2 w-2" /> Lowest total spend
                    </Badge>
                  )}
                  {isBestImprovement && improves && (
                    <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 gap-0.5 bg-primary/10 text-primary border-0">
                      <TrendingDown className="h-2 w-2" /> Largest modeled avg reduction
                    </Badge>
                  )}
                </div>

                {/* Inputs */}
                <div className="space-y-1 text-[10px] text-muted-foreground">
                  <p className="font-mono">{s.input1_label}: {cp}{fmt(s.input1_value)}</p>
                  <p className="font-mono">
                    {s.input2_label}: {s.input2_label.toLowerCase().includes("share") ? fmt4(s.input2_value) : `${cp}${fmt(s.input2_value)}`}
                  </p>
                  <p>Fees: {s.include_fees ? "Yes" : "No"}</p>
                </div>

                {/* Divider */}
                <div className="border-t border-border/50" />

                {/* Results */}
                <div className="space-y-2">
                  {/* Hero: New Avg */}
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Projected Avg</p>
                    <p className={`text-xl font-mono font-bold leading-tight ${isBestAvg ? "text-primary" : ""}`}>
                      {cp}{fmt(s.new_avg_cost)}
                    </p>
                    {improves ? (
                      <span className="text-[10px] font-medium text-primary flex items-center gap-0.5 mt-0.5">
                        <TrendingDown className="h-2.5 w-2.5" />
                        −{cp}{fmt(Math.abs(avgDiff))}/share
                      </span>
                    ) : worsens ? (
                      <span className="text-[10px] font-medium text-destructive flex items-center gap-0.5 mt-0.5">
                        <TrendingUp className="h-2.5 w-2.5" />
                        +{cp}{fmt(Math.abs(avgDiff))}/share
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <CompareRow label="Shares" value={fmt4(s.shares_to_buy)} />
                    <CompareRow label="Total Spend" value={`${cp}${fmt(s.total_spend)}`} highlight={isLowestSpend} />
                    <CompareRow label="Fee Applied" value={`${cp}${fmt(s.fee_applied)}`} />
                    <CompareRow label="New Total" value={fmt4(s.new_total_shares)} />
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border/50" />

                {/* Modeled efficiency */}
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Modeled efficiency</p>
                  {efficiency > 0 ? (
                    <p className="text-xs font-mono font-semibold text-primary">
                      {(efficiency * 1000).toFixed(2)}¢ / $1
                    </p>
                  ) : (
                    <p className="text-xs font-mono text-muted-foreground/50">N/A</p>
                  )}
                  <p className="text-[9px] text-muted-foreground/50 mt-0.5">Modeled avg change per $ in this scenario</p>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 pt-1">
                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 flex-1" onClick={() => onUseScenario(s)}>
                    <ArrowRight className="mr-1 h-2.5 w-2.5" />
                    Use
                  </Button>
                  <Button size="sm" className="h-6 text-[10px] px-2 flex-1" onClick={() => onApplyBuy(s)}>
                    <CheckCircle className="mr-1 h-2.5 w-2.5" />
                    Apply
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CompareRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`text-[11px] font-mono font-medium tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}
