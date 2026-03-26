import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, ArrowRight, Award, BookOpen, TrendingDown, TrendingUp, SlidersHorizontal, Clock, DollarSign, GitCompareArrows, X, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

  const allScenarios = getScenariosForHolding(holdingId);

  const filteredScenarios = useMemo(() => {
    const sorted = [...allScenarios];
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
    { key: "best_avg", label: "Lowest new avg", icon: <Award className="h-3 w-3" /> },
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
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stitch-muted">
            Saved Scenarios
          </h2>
          <p className="text-[11px] text-stitch-muted/70 mt-0.5">
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
                className="h-6 gap-1 border-stitch-border bg-transparent px-2.5 text-[10px] text-white hover:bg-stitch-pill"
                onClick={exitCompareMode}
              >
                <X className="h-3 w-3" />
                Exit Compare
              </Button>
            ) : hasFeature("scenario_compare") ? (
              <Button
                size="sm"
                variant="outline"
                className="h-6 gap-1 border-stitch-border bg-transparent px-2.5 text-[10px] text-white hover:bg-stitch-pill"
                onClick={() => setCompareMode(true)}
              >
                <GitCompareArrows className="h-3 w-3 text-stitch-accent" />
                Compare
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-6 gap-1 border-stitch-border bg-transparent px-2.5 text-[10px] text-stitch-muted opacity-90 hover:bg-stitch-pill hover:text-white"
                onClick={() => toast.info("Enable premium preview in Settings to compare scenarios side-by-side.")}
              >
                <Lock className="h-3 w-3" />
                Compare
                <PremiumBadge className="ml-0.5" />
              </Button>
            )
          )}
          {allScenarios.length > 0 && !compareMode && (
            <span className="text-[10px] text-stitch-muted/50 tabular-nums">{allScenarios.length} total</span>
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
                  ? "bg-stitch-accent/10 border-stitch-accent/30 text-stitch-accent"
                  : "bg-stitch-pill/30 border-stitch-border text-stitch-muted hover:bg-stitch-pill/60 hover:text-white"
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      )}

      {filteredScenarios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stitch-border bg-stitch-pill/10 p-8 text-center space-y-2">
          <BookOpen className="h-5 w-5 mx-auto text-stitch-muted/50" />
          <p className="text-xs text-stitch-muted font-medium">No saved scenarios yet.</p>
          <p className="text-[11px] text-stitch-muted/50">
            Use the Calculator tab, then Save — or add a note when saving to label your plan.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            {filteredScenarios.map((s) => {
              const avgDiff = currentAvg - s.new_avg_cost;
              const improves = avgDiff > 0.005;
              const worsens = avgDiff < -0.005;
              const isSelected = selectedIds.has(s.id);

              const scenarioTitle = (s.notes?.trim() || METHOD_LABELS[s.method] || s.method).slice(0, 120);
              const priceUsed = s.buy_price ?? s.input1_value;
              const savePerShare = Math.max(0, currentAvg - s.new_avg_cost);

              return (
                <div
                  key={s.id}
                  onClick={compareMode ? () => toggleSelect(s.id) : undefined}
                  className={`group rounded-xl border bg-stitch-card p-3.5 transition-all ${
                    compareMode ? "cursor-pointer" : ""
                  } ${
                    isSelected
                      ? "border-stitch-accent/50 bg-stitch-accent/[0.06] ring-1 ring-stitch-accent/25"
                      : "border-stitch-border hover:border-stitch-accent/30"
                  }`}
                >
                  {/* Top line */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {compareMode && (
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "bg-stitch-accent border-stitch-accent" : "border-stitch-muted/40"
                        }`}>
                          {isSelected && <Check className="h-2.5 w-2.5 text-black" />}
                        </div>
                      )}
                      <span className="text-[11px] font-semibold text-white/90 truncate" title={scenarioTitle}>
                        {scenarioTitle}
                      </span>
                    </div>
                    <span className="text-[10px] text-stitch-muted/50 tabular-nums shrink-0">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-[11px] text-stitch-muted font-mono mb-1.5 leading-relaxed">
                    Invest {cp}
                    {fmt(s.budget_invested)} at {cp}
                    {fmt(priceUsed)}
                  </p>
                  <p className="text-[11px] text-white/90 font-mono mb-2.5 leading-relaxed">
                    Avg becomes {cp}
                    {fmt(s.new_avg_cost)}
                    {savePerShare > 0.005 ? (
                      <>
                        {" "}
                        · Avg change {cp}
                        {fmt(savePerShare)}/share
                      </>
                    ) : null}
                  </p>

                  {/* Results row */}
                  <div className="flex items-baseline gap-4 flex-wrap mb-2">
                    <div>
                      <span className="text-[9px] text-stitch-muted uppercase tracking-wider">New Avg</span>
                      <p className="text-base font-mono font-bold text-stitch-accent leading-tight">{cp}{fmt(s.new_avg_cost)}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-stitch-muted uppercase tracking-wider">Total Spend</span>
                      <p className="font-mono text-xs font-medium text-white">
                        {cp}
                        {fmt(s.total_spend)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-stitch-muted uppercase tracking-wider">Shares</span>
                      <p className="font-mono text-xs font-medium text-white">{s.shares_to_buy.toFixed(4)}</p>
                    </div>
                    <div className="ml-auto">
                      {improves ? (
                        <span className="text-[10px] font-medium text-stitch-accent flex items-center gap-0.5">
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
                    <div className="flex gap-1.5 border-t border-stitch-border/50 pt-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 border-stitch-border bg-transparent px-2 text-[10px] text-white hover:bg-stitch-pill"
                        onClick={() => onUseScenario(s)}
                      >
                        <ArrowRight className="mr-1 h-2.5 w-2.5 text-stitch-accent" />
                        Use Scenario
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px] text-stitch-muted hover:bg-stitch-pill/50 hover:text-destructive"
                        onClick={() => setDeleting(s)}
                      >
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
              className="text-[11px] px-0 text-stitch-accent"
              onClick={() => navigate("/scenarios")}
            >
              View all {allScenarios.length} scenarios →
            </Button>
          )}
        </>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="border-stitch-border bg-stitch-card text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete this scenario?</AlertDialogTitle>
            <AlertDialogDescription className="text-stitch-muted">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-stitch-border bg-transparent text-white hover:bg-stitch-pill">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
