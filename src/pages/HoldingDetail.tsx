import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, Undo2 } from "lucide-react";
import GoalLadder from "@/components/GoalLadder";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getHolding, getScenariosForHolding, getRecommendedTargets, getTransactionsForHolding, undoLastBuy, currencyPrefix, exchangeLabel } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

const METHOD_LABELS: Record<string, string> = {
  price_shares: "Price + Shares",
  price_budget: "Price + Budget (Recommended target)",
  price_target: "Price + Target Avg",
  budget_target: "Budget + Target Avg",
};

export default function HoldingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [version, setVersion] = useState(0);
  const [undoing, setUndoing] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const holding = id ? getHolding(id) : undefined;
  const scenarios = id ? getScenariosForHolding(id) : [];
  const recommendedTargets = id ? getRecommendedTargets(id) : [];
  const transactions = id ? getTransactionsForHolding(id) : [];

  // Force re-read when version changes
  void version;

  const latestTx = transactions[0];
  const canUndo = latestTx && latestTx.transaction_type === "buy" && !latestTx.is_undone;

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

  if (!holding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Holding not found.</p>
      </div>
    );
  }

  const cp = currencyPrefix(holding.exchange ?? "US");
  const feeLabel = holding.fee_type === "percent"
    ? `${Number(holding.fee_value).toFixed(2)}%`
    : `${cp}${Number(holding.fee_value ?? holding.fee).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-5">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Holdings
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-primary font-mono">{holding.ticker}</span>
            <span className="text-xs font-medium text-muted-foreground ml-2 bg-muted px-2 py-0.5 rounded-full">
              {exchangeLabel(holding.exchange ?? "US")}
            </span>
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <Stat label="Ticker" value={holding.ticker} />
            <Stat label="Shares" value={Number(holding.shares).toFixed(4)} />
            <Stat label="Avg Cost" value={`${cp}${Number(holding.avg_cost).toFixed(2)}`} />
            <Stat label="Fee" value={feeLabel} />
          </div>
          <Button size="sm" onClick={() => navigate(`/holdings/${id}/dca`)}>
            <Calculator className="mr-1.5 h-4 w-4" />
            Open DCA Calculator
          </Button>
        </div>

        {/* Goal Ladder */}
        <GoalLadder holding={holding} onSaved={() => setVersion((v) => v + 1)} />

        {/* Recommended targets */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Recommended Targets
          </h2>
          {recommendedTargets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recommended targets yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Buy Price</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">% Used</TableHead>
                    <TableHead>Fees</TableHead>
                    <TableHead className="text-right">Fee Applied</TableHead>
                    <TableHead className="text-right">Total Spend</TableHead>
                    <TableHead className="text-right">Rec. Target</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recommendedTargets.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/scenarios/${s.id}`)}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-mono">{s.buy_price != null ? `$${Number(s.buy_price).toFixed(2)}` : "—"}</TableCell>
                      <TableCell className="text-right font-mono">${Number(s.budget_invested).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{s.budget_percent_used != null ? `${s.budget_percent_used}%` : "—"}</TableCell>
                      <TableCell className="text-sm">{s.include_fees ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right font-mono">${Number(s.fee_applied).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">${Number(s.total_spend).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-primary font-semibold">${Number(s.recommended_target!).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Saved scenarios */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Saved Scenarios
          </h2>
          {scenarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved scenarios yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Total Spend</TableHead>
                    <TableHead className="text-right">Shares to Buy</TableHead>
                    <TableHead className="text-right">New Avg Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scenarios.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/scenarios/${s.id}`)}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">{METHOD_LABELS[s.method] ?? s.method}</TableCell>
                      <TableCell className="text-right font-mono">${Number(s.total_spend).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{Number(s.shares_to_buy).toFixed(4)}</TableCell>
                      <TableCell className="text-right font-mono text-primary font-semibold">${Number(s.new_avg_cost).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Transaction history */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Transaction History
            </h2>
            {canUndo && (
              <Button
                variant="outline"
                size="sm"
                disabled={undoing}
                onClick={() => setShowUndoConfirm(true)}
              >
                <Undo2 className="mr-1.5 h-4 w-4" />
                {undoing ? "Undoing…" : "Undo last applied buy"}
              </Button>
            )}
          </div>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet. Use "Apply this buy" in the DCA Calculator to record trades.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Buy Price</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Total Spend</TableHead>
                    <TableHead className="text-right">New Shares</TableHead>
                    <TableHead className="text-right">New Avg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id} className={t.is_undone ? "opacity-50" : ""}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm capitalize">{t.transaction_type}</TableCell>
                      <TableCell className="text-sm">
                        {t.is_undone ? (
                          <span className="text-muted-foreground italic">Undone</span>
                        ) : (
                          <span className="text-primary font-medium">Applied</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">{cp}{Number(t.buy_price).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{Number(t.shares_bought).toFixed(4)}</TableCell>
                      <TableCell className="text-right font-mono">{cp}{Number(t.budget_invested).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{cp}{Number(t.fee_applied).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{cp}{Number(t.total_spend).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{Number(t.new_total_shares).toFixed(4)}</TableCell>
                      <TableCell className="text-right font-mono text-primary font-semibold">{cp}{Number(t.new_avg_cost).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Undo confirmation dialog */}
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
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-lg font-mono font-semibold">{value}</p>
    </div>
  );
}