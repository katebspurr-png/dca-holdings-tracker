import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Calculator, RotateCcw, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import HoldingFormDialog from "@/components/HoldingFormDialog";
import {
  getHoldings, addHolding, editHolding, removeHolding,
  getScenarios, resetAll, exportData, importData,
  type Holding, type FeeType, type Scenario,
} from "@/lib/storage";
import { toast } from "sonner";

export default function Holdings() {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);
  const [deleting, setDeleting] = useState<Holding | null>(null);
  const [tick, setTick] = useState(0); // force re-render after mutations
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => setTick((t) => t + 1);

  const holdings = getHoldings();
  const scenarios = getScenarios();

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleCreate = (data: Omit<Holding, "id" | "created_at">) => {
    addHolding(data);
    setFormOpen(false);
    toast.success("Holding added");
    refresh();
  };

  const handleUpdate = (data: Omit<Holding, "id" | "created_at">) => {
    if (!editing) return;
    editHolding(editing.id, data);
    setEditing(null);
    setFormOpen(false);
    toast.success("Holding updated");
    refresh();
  };

  const handleDelete = (id: string) => {
    removeHolding(id);
    setDeleting(null);
    toast.success("Holding deleted");
    refresh();
  };

  const handleReset = useCallback(() => {
    resetAll();
    toast.success("Reset to demo data");
    refresh();
  }, []);

  const handleExport = useCallback(() => {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `dca-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported");
  }, []);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importData(reader.result as string);
        toast.success("Data imported");
        refresh();
      } catch {
        toast.error("Invalid backup file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight">DCA Down</h1>
          <div className="flex items-center gap-2">
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Holding
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        {holdings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground mb-4">No holdings yet.</p>
            <Button onClick={() => setFormOpen(true)} variant="outline" size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add your first holding
            </Button>
          </div>
        ) : (
          <>
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
                  {holdings.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>
                        <button
                          onClick={() => navigate(`/holdings/${h.id}`)}
                          className="font-mono font-semibold text-primary underline underline-offset-2 hover:opacity-80"
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
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(h); setFormOpen(true); }} aria-label="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleting(h)} aria-label="Delete" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/holdings/${h.id}/dca`)}>
                            <Calculator className="mr-1 h-4 w-4" />
                            DCA
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Recent calculations */}
            {scenarios.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Calculations
                </h2>
                <div className="space-y-2">
                  {scenarios.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="rounded-lg border border-border bg-card p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/scenarios/${s.id}`)}
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <div>
                          <span className="font-mono font-semibold text-primary">{s.ticker}</span>
                          <span className="ml-2 text-sm text-muted-foreground">
                            {s.method.replace(/_/g, " ")}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-mono text-muted-foreground">
                        {Number(s.shares_to_buy).toFixed(4)} shares · ${Number(s.total_spend).toFixed(2)} total · New avg ${Number(s.new_avg_cost).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Data management buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
          <Button onClick={handleReset} size="sm" variant="outline">
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reset Everything
          </Button>
          <Button onClick={handleExport} size="sm" variant="outline">
            <Download className="mr-1.5 h-4 w-4" />
            Export Data
          </Button>
          <Button onClick={() => fileRef.current?.click()} size="sm" variant="outline">
            <Upload className="mr-1.5 h-4 w-4" />
            Import Data
          </Button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </main>

      <HoldingFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}
        initial={editing}
        loading={false}
        onSubmit={(data) => editing ? handleUpdate(data) : handleCreate(data)}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.ticker}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && handleDelete(deleting.id)}
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
