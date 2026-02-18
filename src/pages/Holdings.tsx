import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Calculator, RotateCcw } from "lucide-react";
import type { FeeType } from "@/lib/supabase-holdings";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import HoldingFormDialog from "@/components/HoldingFormDialog";
import {
  fetchHoldings,
  createHolding,
  updateHolding,
  deleteHolding,
  type Holding,
} from "@/lib/supabase-holdings";
import { toast } from "sonner";

// ── Demo data ──────────────────────────────────────────────
const DEMO_HOLDINGS: Holding[] = [
  { id: "demo-aapl", ticker: "AAPL", shares: 75, avg_cost: 198.5, fee: 0, fee_type: "flat" as FeeType, fee_value: 0, created_at: new Date().toISOString() },
  { id: "demo-nvda", ticker: "NVDA", shares: 30, avg_cost: 142.8, fee: 0, fee_type: "flat" as FeeType, fee_value: 0, created_at: new Date().toISOString() },
  { id: "demo-tsla", ticker: "TSLA", shares: 20, avg_cost: 385, fee: 0, fee_type: "flat" as FeeType, fee_value: 0, created_at: new Date().toISOString() },
];

interface DemoCalc {
  id: string;
  ticker: string;
  description: string;
  shares: number;
  avgCost: number;
  method: string;
  result: string;
}

const DEMO_CALCS: DemoCalc[] = [
  {
    id: "demo-calc-1",
    ticker: "NVDA",
    description: "DCA to $125 at $112.50",
    shares: 30,
    avgCost: 142.8,
    method: "Price + Target Avg",
    result: "43 shares needed, ↓$17.80 / 12.5%",
  },
  {
    id: "demo-calc-2",
    ticker: "TSLA",
    description: "Budget $1,000 at $340",
    shares: 20,
    avgCost: 385,
    method: "Price + Budget",
    result: "2 shares, new avg $380.91, ↓$4.09 / 1.1%",
  },
  {
    id: "demo-calc-3",
    ticker: "AAPL",
    description: "DCA to $185 at $172 + Budget $2,000 at $172",
    shares: 75,
    avgCost: 198.5,
    method: "Price + Target / Budget",
    result: "78 shares ↓$13.50 / 6.8% · 11 shares new avg $195.11 ↓$3.39 / 1.7%",
  },
];

const DEMO_DISMISSED_KEY = "dca-demo-dismissed";

export default function Holdings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);
  const [deleting, setDeleting] = useState<Holding | null>(null);

  const [demoDismissed, setDemoDismissed] = useState(
    () => localStorage.getItem(DEMO_DISMISSED_KEY) === "true"
  );

  const { data: holdings = [], isLoading } = useQuery({
    queryKey: ["holdings"],
    queryFn: fetchHoldings,
  });

  const showDemo = !demoDismissed && holdings.length === 0 && !isLoading;

  const handleResetDemo = useCallback(() => {
    localStorage.setItem(DEMO_DISMISSED_KEY, "true");
    setDemoDismissed(true);
  }, []);

  const createMut = useMutation({
    mutationFn: (h: Omit<Holding, "id" | "created_at">) => createHolding(h),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      setFormOpen(false);
      toast.success("Holding added");
    },
    onError: () => toast.error("Failed to add holding"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...rest }: { id: string; ticker: string; shares: number; avg_cost: number; fee: number; fee_type: FeeType; fee_value: number }) =>
      updateHolding(id, rest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      setEditing(null);
      toast.success("Holding updated");
    },
    onError: () => toast.error("Failed to update holding"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteHolding(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      setDeleting(null);
      toast.success("Holding deleted");
    },
    onError: () => toast.error("Failed to delete holding"),
  });

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const displayHoldings = showDemo ? DEMO_HOLDINGS : holdings;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight">
            DCA Down
          </h1>
          <div className="flex items-center gap-2">
            {showDemo && (
              <Button onClick={handleResetDemo} size="sm" variant="outline">
                <RotateCcw className="mr-1.5 h-4 w-4" />
                Reset Everything
              </Button>
            )}
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Holding
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        {isLoading ? (
          <p className="text-muted-foreground text-center py-20">Loading…</p>
        ) : displayHoldings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground mb-4">No holdings yet.</p>
            <Button onClick={() => setFormOpen(true)} variant="outline" size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add your first holding
            </Button>
          </div>
        ) : (
          <>
            {showDemo && (
              <p className="text-sm text-muted-foreground">
                Showing demo data. Add a real holding or click <strong>Reset Everything</strong> to clear.
              </p>
            )}
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Ticker</TableHead>
                    <TableHead className="font-semibold text-right">Shares</TableHead>
                    <TableHead className="font-semibold text-right">Avg Cost</TableHead>
                    <TableHead className="font-semibold text-right">Fee</TableHead>
                    <TableHead className="text-right w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayHoldings.map((h) => {
                    const isDemo = h.id.startsWith("demo-");
                    return (
                      <TableRow key={h.id} className={isDemo ? "opacity-75" : ""}>
                        <TableCell>
                          <button
                            onClick={() => !isDemo && navigate(`/holdings/${h.id}`)}
                            className={`font-mono font-semibold ${isDemo ? "cursor-default" : "text-primary underline underline-offset-2 hover:opacity-80"}`}
                            disabled={isDemo}
                          >
                            {h.ticker}
                          </button>
                        </TableCell>
                        <TableCell className="text-right font-mono">{fmt(h.shares)}</TableCell>
                        <TableCell className="text-right font-mono">${fmt(h.avg_cost)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {h.fee_type === "percent"
                            ? `${Number(h.fee_value).toFixed(2)}%`
                            : `$${Number(h.fee_value ?? h.fee).toFixed(2)}`}
                        </TableCell>
                        <TableCell className="text-right">
                          {!isDemo && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setEditing(h); setFormOpen(true); }}
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleting(h)}
                                aria-label="Delete"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/holdings/${h.id}/dca`)}
                              >
                                <Calculator className="mr-1 h-4 w-4" />
                                DCA
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Demo recent calculations */}
            {showDemo && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Calculations (demo)
                </h2>
                <div className="space-y-2">
                  {DEMO_CALCS.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border border-border bg-card p-4 opacity-75"
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <div>
                          <span className="font-mono font-semibold text-primary">{c.ticker}</span>
                          <span className="ml-2 text-sm text-muted-foreground">
                            {c.shares} shares @ ${fmt(c.avgCost)} avg
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{c.method}</span>
                      </div>
                      <p className="mt-1 text-sm text-foreground">{c.description}</p>
                      <p className="mt-0.5 text-sm font-mono text-muted-foreground">{c.result}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <HoldingFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        initial={editing}
        loading={createMut.isPending || updateMut.isPending}
        onSubmit={(data) => {
          if (editing) {
            updateMut.mutate({ id: editing.id, ...data });
          } else {
            createMut.mutate(data);
          }
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.ticker}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
