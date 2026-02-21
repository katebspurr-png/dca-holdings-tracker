import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Calculator, RotateCcw, Download, Upload, X, TrendingDown, DollarSign, BarChart3, FileSpreadsheet, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import HoldingFormDialog from "@/components/HoldingFormDialog";
import LivePriceDisplay from "@/components/LivePriceDisplay";
import { ENABLE_LOOKUP_LIMIT } from "@/lib/pro";
import ProSettings from "@/components/ProSettings";
import CsvImportDialog from "@/components/CsvImportDialog";
import {
  getHoldings, addHolding, editHolding, removeHolding,
  getScenariosForHolding, getScenarios, resetAll, exportData, importData,
  type Holding, type FeeType, type Scenario,
} from "@/lib/storage";
import { toast } from "sonner";

export default function Holdings() {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);
  const [deleting, setDeleting] = useState<Holding | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [csvOpen, setCsvOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => setTick((t) => t + 1);

  const holdings = getHoldings();

  // Auto-select first holding if none selected or selected was deleted
  const selected = holdings.find((h) => h.id === selectedId) ?? holdings[0] ?? null;
  const selectedScenarios = selected ? getScenariosForHolding(selected.id) : [];

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Portfolio summary ──────────────────────────────────────
  const totalStocks = holdings.length;
  const totalInvested = holdings.reduce((sum, h) => sum + h.shares * h.avg_cost, 0);

  // ── Handlers ───────────────────────────────────────────────
  const handleCreate = (data: Omit<Holding, "id" | "created_at">) => {
    const h = addHolding(data);
    setFormOpen(false);
    setSelectedId(h.id);
    toast.success("Stock added");
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
    if (selectedId === id) setSelectedId(null);
    toast.success("Stock deleted");
    refresh();
  };

  const handleReset = useCallback(() => {
    resetAll();
    setSelectedId(null);
    toast.success("Reset to demo data");
    refresh();
  }, []);

  const handleExport = useCallback(() => {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dca-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
        setSelectedId(null);
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
          <div className="flex items-center gap-1">
            <Button onClick={() => navigate("/what-if")} size="sm" variant="ghost">
              <Shuffle className="mr-1.5 h-4 w-4" />
              What-If
            </Button>
            <Button onClick={() => navigate("/scenarios")} size="sm" variant="ghost">
              <BarChart3 className="mr-1.5 h-4 w-4" />
              All Scenarios
            </Button>
            {ENABLE_LOOKUP_LIMIT && <ProSettings onChanged={refresh} />}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Portfolio summary card */}
        {holdings.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Stocks:</span>
                <span className="font-semibold">{totalStocks}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Total Invested:</span>
                <span className="font-mono font-semibold">${fmt(totalInvested)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Stock chips / pills selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {holdings.map((h) => {
            const isActive = selected?.id === h.id;
            return (
              <button
                key={h.id}
                onClick={() => setSelectedId(h.id)}
                className={`group relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold font-mono whitespace-nowrap transition-all
                  ${isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
              >
                {h.ticker}
                <span className={`text-xs font-normal ${isActive ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                  {h.shares}sh
                </span>
                {/* Delete x button */}
                <span
                  role="button"
                  aria-label={`Delete ${h.ticker}`}
                  onClick={(e) => { e.stopPropagation(); setDeleting(h); }}
                  className={`ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity
                    ${isActive
                      ? "hover:bg-primary-foreground/20 text-primary-foreground"
                      : "hover:bg-foreground/10 text-muted-foreground"
                    }`}
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            );
          })}

          {/* + Add Stock chip */}
          <button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="flex items-center gap-1 rounded-full border-2 border-dashed border-border px-4 py-2 text-sm font-medium text-muted-foreground whitespace-nowrap transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Stock
          </button>
        </div>

        {/* Selected stock detail */}
        {selected ? (
          <div className="space-y-6">
            {/* Holding stats card */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold font-mono text-primary">{selected.ticker}</h2>
                  <LivePriceDisplay ticker={selected.ticker} />
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(selected); setFormOpen(true); }} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/holdings/${selected.id}/dca`)}>
                    <Calculator className="mr-1 h-4 w-4" />
                    DCA Calculator
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat label="Shares" value={fmt(selected.shares)} />
                <Stat label="Avg Cost" value={`$${fmt(selected.avg_cost)}`} />
                <Stat label="Position Value" value={`$${fmt(selected.shares * selected.avg_cost)}`} />
                <Stat
                  label={`Fee (${selected.fee_type})`}
                  value={selected.fee_type === "percent"
                    ? `${Number(selected.fee_value).toFixed(2)}%`
                    : `$${Number(selected.fee_value ?? selected.fee).toFixed(2)}`}
                />
              </div>
            </div>

            {/* Recent calculations for this stock */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Saved Calculations — {selected.ticker}
                </h2>
                {selectedScenarios.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/holdings/${selected.id}`)}>
                    View all →
                  </Button>
                )}
              </div>
              {selectedScenarios.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No calculations saved for {selected.ticker} yet.</p>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/holdings/${selected.id}/dca`)}>
                    <Calculator className="mr-1.5 h-4 w-4" />
                    Run DCA Calculator
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedScenarios.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="rounded-lg border border-border bg-card p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/scenarios/${s.id}`)}
                    >
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-sm text-muted-foreground">
                          {s.method.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-mono">
                        {Number(s.shares_to_buy).toFixed(4)} shares · ${Number(s.total_spend).toFixed(2)} total ·{" "}
                        <span className="text-primary font-semibold">New avg ${Number(s.new_avg_cost).toFixed(2)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground mb-4">No stocks in your portfolio yet.</p>
            <Button onClick={() => setFormOpen(true)} variant="outline" size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add your first stock
            </Button>
          </div>
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
          <Button onClick={() => setCsvOpen(true)} size="sm" variant="outline">
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            Import from CSV
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
            <AlertDialogTitle>Delete {deleting?.ticker} and all its data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the stock position and all saved calculations for {deleting?.ticker}. This action cannot be undone.
            </AlertDialogDescription>
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

      <CsvImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        onImported={(firstId) => { setSelectedId(firstId); refresh(); }}
      />
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
