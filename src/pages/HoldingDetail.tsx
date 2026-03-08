import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, Undo2, TrendingDown, TrendingUp, Award, ArrowRight, Trash2 } from "lucide-react";
import GoalLadder from "@/components/GoalLadder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getHolding, getScenariosForHolding, getTransactionsForHolding,
  undoLastBuy, removeScenario, currencyPrefix, exchangeLabel, apiTicker, type Scenario,
} from "@/lib/storage";
import { getCachedQuote } from "@/lib/stock-price";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

const METHOD_LABELS: Record<string, string> = {
  price_shares: "Price + Shares",
  price_budget: "Price + Budget",
  price_target: "Price + Target Avg",
  budget_target: "Budget + Target Avg",
};

const fmt2 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt4 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

export default function HoldingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [version, setVersion] = useState(0);
  const [undoing, setUndoing] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [deletingScenario, setDeletingScenario] = useState<Scenario | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const holding = id ? getHolding(id) : undefined;
  const scenarios = id ? getScenariosForHolding(id) : [];
  const transactions = id ? getTransactionsForHolding(id) : [];
  void version;

  const latestTx = transactions[0];
  const canUndo = latestTx && latestTx.transaction_type === "buy" && !latestTx.is_undone;

  const exchange = holding?.exchange ?? "US";
  const cp = holding ? currencyPrefix(exchange) : "$";

  // Market data
  const quote = useMemo(() => {
    if (!holding) return null;
    return getCachedQuote(apiTicker(holding.ticker, exchange).toUpperCase());
  }, [holding, exchange]);

  const marketPrice = quote?.price ?? null;
  const S = holding ? Number(holding.shares) : 0;
  const A = holding ? Number(holding.avg_cost) : 0;
  const costBasis = S * A;
  const marketValue = marketPrice != null ? S * marketPrice : null;
  const unrealizedPL = marketValue != null ? marketValue - costBasis : null;
  const unrealizedPct = unrealizedPL != null && costBasis > 0 ? (unrealizedPL / costBasis) * 100 : null;

  // Best scenario
  const bestScenario = scenarios.length > 1
    ? scenarios.reduce((best, s) => s.new_avg_cost < best.new_avg_cost ? s : best, scenarios[0])
    : null;

  const confirmUndo = () => {
    if (!id || undoing) return;
    setUndoing(true);
    setShowUndoConfirm(false);
    try {
      undoLastBuy(id);
      toast({ title: "Last buy undone successfully" });
      setVersion((v) => v + 1);
    } catch (e: any) {
      toast({ title: "Failed to undo", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setUndoing(false);
    }
  };

  const handleDeleteScenario = () => {
    if (!deletingScenario) return;
    removeScenario(deletingScenario.id);
    setDeletingScenario(null);
    setVersion((v) => v + 1);
    sonnerToast.success("Scenario deleted");
  };

  if (!holding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Holding not found.</p>
      </div>
    );
  }

  const feeLabel = holding.fee_type === "percent"
    ? `${Number(holding.fee_value).toFixed(2)}%`
    : `${cp}${Number(holding.fee_value ?? holding.fee).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 sm:px-6 py-3">
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h1 className="text-lg font-bold tracking-tight truncate">
              <span className="text-primary font-mono">{holding.ticker}</span>
              <span className="text-muted-foreground font-normal ml-1.5 text-sm">Goal Ladder</span>
            </h1>
            <Badge variant="outline" className="text-[10px] px-1.5 h-5 shrink-0">{exchangeLabel(exchange)}</Badge>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => navigate(`/holdings/${id}/dca`)}>
            <Calculator className="mr-1 h-3.5 w-3.5" />
            Calculator
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6">
        {/* Position Overview */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Position Overview</h2>
            {canUndo && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 text-muted-foreground hover:text-destructive"
                disabled={undoing}
                onClick={() => setShowUndoConfirm(true)}
              >
                <Undo2 className="mr-1 h-3 w-3" />
                Undo last buy
              </Button>
            )}
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
              <span>Fee: {feeLabel}</span>
            </div>
          )}
          {(!quote || quote.todayOpen == null) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-mono mt-3 pt-3 border-t border-border">
              <span>Fee: {feeLabel} ({holding.fee_type})</span>
            </div>
          )}
        </div>

        {/* Goal Ladder */}
        <GoalLadder holding={holding} onSaved={() => setVersion((v) => v + 1)} />

        {/* Saved Scenarios for this holding */}
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Saved Scenarios</h2>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">Previously saved DCA plans for {holding.ticker}.</p>
            </div>
            {scenarios.length > 0 && (
              <span className="text-[10px] text-muted-foreground/50 tabular-nums">{scenarios.length} total</span>
            )}
          </div>

          {scenarios.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-center space-y-1.5">
              <p className="text-xs text-muted-foreground">No scenarios saved yet.</p>
              <p className="text-[11px] text-muted-foreground/50">Save from Goal Ladder cards or the DCA Calculator.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {scenarios.slice(0, 5).map((s) => {
                const isBest = bestScenario && s.id === bestScenario.id;
                const avgDiff = A - s.new_avg_cost;
                const improves = avgDiff > 0.005;

                return (
                  <div
                    key={s.id}
                    className={`rounded-xl border bg-card p-3.5 transition-all hover:border-primary/20 ${
                      isBest ? "border-primary/30 bg-primary/[0.02]" : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-foreground/80">
                          {METHOD_LABELS[s.method] ?? s.method}
                        </span>
                        {isBest && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 bg-primary/10 text-primary border-0">
                            <Award className="h-2.5 w-2.5" /> Best Avg
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground font-mono mb-2">
                      {s.input1_label} {cp}{fmt2(s.input1_value)} · {s.input2_label} {s.input2_label.toLowerCase().includes("share") ? s.input2_value.toFixed(4) : `${cp}${fmt2(s.input2_value)}`}
                    </p>

                    <div className="flex items-baseline gap-4 flex-wrap mb-2">
                      <div>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">New Avg</span>
                        <p className="text-base font-mono font-bold text-primary leading-tight">{cp}{fmt2(s.new_avg_cost)}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Total Spend</span>
                        <p className="text-xs font-mono font-medium">{cp}{fmt2(s.total_spend)}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Shares</span>
                        <p className="text-xs font-mono font-medium">{s.shares_to_buy.toFixed(4)}</p>
                      </div>
                      {improves && (
                        <div className="ml-auto">
                          <span className="text-[10px] font-medium text-primary flex items-center gap-0.5">
                            <TrendingDown className="h-3 w-3" />
                            −{cp}{fmt2(Math.abs(avgDiff))}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1.5 pt-1.5 border-t border-border/50">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2"
                        onClick={() => navigate(`/holdings/${id}/dca?method=${s.method}&val1=${s.input1_value}&val2=${s.input2_value}`)}
                      >
                        <ArrowRight className="mr-1 h-2.5 w-2.5" />
                        Use in Calculator
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingScenario(s)}
                      >
                        <Trash2 className="mr-1 h-2.5 w-2.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
              {scenarios.length > 5 && (
                <Button variant="link" size="sm" className="text-[11px] px-0 text-primary" onClick={() => navigate("/scenarios")}>
                  View all {scenarios.length} scenarios →
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Transaction summary (compact) */}
        {transactions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Recent Transactions</h2>
            <div className="grid gap-1.5">
              {transactions.slice(0, 3).map((t) => (
                <div key={t.id} className={`rounded-lg border border-border bg-card p-2.5 flex items-center justify-between ${t.is_undone ? "opacity-40" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground tabular-nums">{new Date(t.created_at).toLocaleDateString()}</span>
                    <span className="text-[11px] font-mono">
                      {t.shares_bought.toFixed(2)} shares @ {cp}{Number(t.buy_price).toFixed(2)}
                    </span>
                    {t.is_undone && <span className="text-[9px] italic text-muted-foreground">Undone</span>}
                  </div>
                  <span className="text-[11px] font-mono font-medium">{cp}{fmt2(t.total_spend)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Undo confirmation */}
      <AlertDialog open={showUndoConfirm} onOpenChange={setShowUndoConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo the last applied buy for {holding.ticker}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the previous shares and average cost. The transaction will be marked as undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUndo}>Undo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete scenario confirmation */}
      <AlertDialog open={!!deletingScenario} onOpenChange={(o) => !o && setDeletingScenario(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this scenario?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteScenario}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
      }`}>{value}</p>
      {sub && (
        <p className={`text-[10px] font-mono ${positive ? "text-primary" : negative ? "text-destructive" : "text-muted-foreground"}`}>{sub}</p>
      )}
    </div>
  );
}
