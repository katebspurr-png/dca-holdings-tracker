import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, ArrowRight, Award, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { getScenariosForHolding, removeScenario, currencyPrefix, type Scenario, type Exchange } from "@/lib/storage";
import { toast } from "sonner";

const METHOD_LABELS: Record<string, string> = {
  price_shares: "Price + Shares",
  price_budget: "Price + Budget",
  price_target: "Price + Target Avg",
  budget_target: "Budget + Target Avg",
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  holdingId: string;
  exchange: Exchange;
  onUseScenario: (s: Scenario) => void;
  refreshKey: number;
}

export default function SavedScenarios({ holdingId, exchange, onUseScenario, refreshKey }: Props) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState<Scenario | null>(null);
  const [localTick, setLocalTick] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scenarios = getScenariosForHolding(holdingId).slice(0, 5);
  const cp = currencyPrefix(exchange);

  // Find best avg (lowest new_avg_cost)
  const bestId = scenarios.length > 1
    ? scenarios.reduce((best, s) => s.new_avg_cost < best.new_avg_cost ? s : best, scenarios[0]).id
    : null;

  const handleDelete = () => {
    if (!deleting) return;
    removeScenario(deleting.id);
    setDeleting(null);
    setLocalTick((t) => t + 1);
    toast.success("Scenario deleted");
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Saved Scenarios
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Compare previously saved DCA plans for this holding.
        </p>
      </div>

      {scenarios.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center space-y-2">
          <BookOpen className="h-5 w-5 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No scenarios saved yet. Save a scenario to compare different DCA strategies.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Use the Save scenario button after running a calculation.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            {scenarios.map((s) => {
              const isBest = s.id === bestId;
              return (
                <div
                  key={s.id}
                  className={`rounded-lg border bg-card p-3.5 space-y-2 transition-colors ${
                    isBest ? "border-primary/40" : "border-border"
                  }`}
                >
                  {/* Top line */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {METHOD_LABELS[s.method] ?? s.method}
                      </span>
                      {isBest && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                          <Award className="h-2.5 w-2.5" />
                          Best Avg
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/60">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Inputs */}
                  <p className="text-xs text-muted-foreground font-mono">
                    {s.input1_label} {cp}{fmt(s.input1_value)} · {s.input2_label} {s.input2_label.toLowerCase().includes("share") ? s.input2_value.toFixed(4) : `${cp}${fmt(s.input2_value)}`}
                  </p>

                  {/* Results */}
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">New Avg</span>
                      <p className="text-sm font-mono font-semibold text-primary">{cp}{fmt(s.new_avg_cost)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Spend</span>
                      <p className="text-sm font-mono">{cp}{fmt(s.total_spend)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Shares</span>
                      <p className="text-sm font-mono">{s.shares_to_buy.toFixed(4)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onUseScenario(s)}>
                      <ArrowRight className="mr-1 h-3 w-3" />
                      Use Scenario
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={() => setDeleting(s)}>
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {getScenariosForHolding(holdingId).length > 5 && (
            <Button
              variant="link"
              size="sm"
              className="text-xs px-0"
              onClick={() => navigate("/scenarios")}
            >
              View all scenarios →
            </Button>
          )}
        </>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this scenario?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
