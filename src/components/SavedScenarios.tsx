import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, ArrowRight, Award, BookOpen, TrendingDown, TrendingUp, SlidersHorizontal, Clock, DollarSign, GitCompareArrows, X, Check, Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { getScenariosForHolding, removeScenario, type Scenario, type Exchange } from "@/lib/storage";
import ScenarioCompare from "@/components/ScenarioCompare";
import { toast } from "sonner";
import { hasFeature } from "@/lib/feature-access";
import { PremiumBadge } from "@/components/PremiumGate";

const METHOD_LABELS: Record<string, string> = {
  price_shares: "Price + Shares",
  price_budget: "Price + Budget",
  price_target: "Price + Target Avg",
  budget_target: "Budget + Target Avg",
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type FilterMode = "all" | "best_avg" | "lowest_spend" | "most_recent";

interface Props {
  holdingId: string;
  exchange: Exchange;
  onUseScenario: (s: Scenario) => void;
  onApplyBuy: (s: Scenario) => void;
  refreshKey: number;
  currentAvg: number;
  currencyPrefix: string;
}

export default function SavedScenarios({ holdingId, exchange, onUseScenario, onApplyBuy, refreshKey, currentAvg, currencyPrefix: cp }: Props) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState<Scenario | null>(null);
  const [localTick, setLocalTick] = useState(0);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allScenarios = getScenariosForHolding(holdingId);

  const filteredScenarios = useMemo(() => {
    let sorted = [...allScenarios];
    switch (filter) {
      case "best_avg":
        sorted.sort((a, b) => a.new_avg_cost - b.new_avg_cost);
        break;
      case "lowest_spend":
        sorted.sort((a, b) => a.total_spend - b.total_spend);
        break;
      case "most_recent":
      case "all":
      default:
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    return sorted.slice(0, 5);
  }, [allScenarios, filter]);

  const selectedScenarios = useMemo(() =>
    allScenarios.filter((s) => selectedIds.has(s.id)),
    [allScenarios, selectedIds]
  );

  const bestId = allScenarios.length > 1
    ? allScenarios.reduce((best, s) => s.new_avg_cost < best.new_avg_cost ? s : best, allScenarios[0]).id
    : null;

  const handleDelete = () => {
    if (!deleting) return;
    removeScenario(deleting.id);
    setDeleting(null);
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(deleting.id); return next; });
    setLocalTick((t) => t + 1);
    toast.success("Scenario deleted");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 3) {
          toast.error("You can compare up to 3 scenarios at a time.");
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedIds(new Set());
  };

  const filters: { key: FilterMode; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All", icon: <SlidersHorizontal className="h-3 w-3" /> },
    { key: "best_avg", label: "Best Avg", icon: <Award className="h-3 w-3" /> },
    { key: "lowest_spend", label: "Lowest Spend", icon: <DollarSign className="h-3 w-3" /> },
    { key: "most_recent", label: "Most Recent", icon: <Clock className="h-3 w-3" /> },
  ];

  return (
    <div className="space-y-3">
      {/* Compare panel */}
      {compareMode && selectedScenarios.length >= 2 && (
        <ScenarioCompare
          scenarios={selectedScenarios}
          currentAvg={currentAvg}
          cp={cp}
          onUseScenario={(s) => { exitCompareMode(); onUseScenario(s); }}
          onApplyBuy={(s) => { exitCompareMode(); onApplyBuy(s); }}
        />
      )}

      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Saved Scenarios
          </h2>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            {compareMode
              ? `Select 2–3 scenarios to compare. ${selectedIds.size}/3 selected.`
              : "Compare previously saved DCA plans for this holding."}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {allScenarios.length >= 2 && (
            compareMode ? (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2.5 gap-1"
                onClick={exitCompareMode}
              >
                <X className="h-3 w-3" />
                Exit Compare
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2.5 gap-1"
                onClick={() => setCompareMode(true)}
              >
                <GitCompareArrows className="h-3 w-3" />
                Compare
              </Button>
            )
          )}
          {allScenarios.length > 0 && !compareMode && (
            <span className="text-[10px] text-muted-foreground/50 tabular-nums">{allScenarios.length} total</span>
          )}
        </div>
      </div>

      {/* Filter chips */}
      {allScenarios.length > 1 && !compareMode && (
        <div className="flex gap-1.5 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                filter === f.key
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted/30 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      )}

      {filteredScenarios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/10 p-8 text-center space-y-2">
          <BookOpen className="h-5 w-5 mx-auto text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">
            No scenarios saved yet. Save a scenario to compare different DCA strategies.
          </p>
          <p className="text-[11px] text-muted-foreground/50">
            Use the Save button after running a calculation.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            {filteredScenarios.map((s) => {
              const isBest = s.id === bestId;
              const avgDiff = currentAvg - s.new_avg_cost;
              const improves = avgDiff > 0.005;
              const worsens = avgDiff < -0.005;
              const isSelected = selectedIds.has(s.id);

              return (
                <div
                  key={s.id}
                  onClick={compareMode ? () => toggleSelect(s.id) : undefined}
                  className={`group rounded-xl border bg-card p-3.5 transition-all ${
                    compareMode ? "cursor-pointer" : ""
                  } ${
                    isSelected
                      ? "border-primary/50 bg-primary/[0.04] ring-1 ring-primary/20"
                      : isBest
                        ? "border-primary/30 bg-primary/[0.02] hover:border-primary/20"
                        : "border-border hover:border-primary/20"
                  }`}
                >
                  {/* Top line */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {compareMode && (
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                        }`}>
                          {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </div>
                      )}
                      <span className="text-[11px] font-medium text-foreground/80">
                        {METHOD_LABELS[s.method] ?? s.method}
                      </span>
                      {isBest && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 bg-primary/10 text-primary border-0">
                          <Award className="h-2.5 w-2.5" />
                          Best Avg
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Inputs */}
                  <p className="text-[11px] text-muted-foreground font-mono mb-2.5">
                    {s.input1_label} {cp}{fmt(s.input1_value)} · {s.input2_label} {s.input2_label.toLowerCase().includes("share") ? s.input2_value.toFixed(4) : `${cp}${fmt(s.input2_value)}`}
                  </p>

                  {/* Results row */}
                  <div className="flex items-baseline gap-4 flex-wrap mb-2">
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">New Avg</span>
                      <p className="text-base font-mono font-bold text-primary leading-tight">{cp}{fmt(s.new_avg_cost)}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Total Spend</span>
                      <p className="text-xs font-mono font-medium">{cp}{fmt(s.total_spend)}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Shares</span>
                      <p className="text-xs font-mono font-medium">{s.shares_to_buy.toFixed(4)}</p>
                    </div>
                    <div className="ml-auto">
                      {improves ? (
                        <span className="text-[10px] font-medium text-primary flex items-center gap-0.5">
                          <TrendingDown className="h-3 w-3" />
                          −{cp}{fmt(Math.abs(avgDiff))}
                        </span>
                      ) : worsens ? (
                        <span className="text-[10px] font-medium text-destructive flex items-center gap-0.5">
                          <TrendingUp className="h-3 w-3" />
                          +{cp}{fmt(Math.abs(avgDiff))}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions */}
                  {!compareMode && (
                    <div className="flex gap-1.5 pt-1.5 border-t border-border/50">
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => onUseScenario(s)}>
                        <ArrowRight className="mr-1 h-2.5 w-2.5" />
                        Use Scenario
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-muted-foreground hover:text-destructive" onClick={() => setDeleting(s)}>
                        <Trash2 className="mr-1 h-2.5 w-2.5" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {allScenarios.length > 5 && !compareMode && (
            <Button
              variant="link"
              size="sm"
              className="text-[11px] px-0 text-primary"
              onClick={() => navigate("/scenarios")}
            >
              View all {allScenarios.length} scenarios →
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
