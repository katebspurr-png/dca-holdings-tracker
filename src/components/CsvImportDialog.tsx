import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import { FileSpreadsheet, Upload, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getHoldings, addHolding, editHolding, type Holding } from "@/lib/storage";
import { toast } from "sonner";

// ── Column auto-detection ────────────────────────────────────

const TICKER_NAMES = ["symbol", "ticker", "stock", "instrument"];
const SHARES_NAMES = ["shares", "quantity", "qty", "units"];
const PRICE_NAMES = [
  "avg price",
  "average price",
  "average cost",
  "cost basis per share",
  "avg cost",
  "book value per share",
  "price paid",
  "unit cost",
];

// Total book-value columns: need to be divided by shares to get per-share cost
const BOOK_VALUE_NAMES = [
  "book value",
  "book cost",
  "total cost",
  "cost basis",
  "acb",
];
const EXCHANGE_NAMES = ["exchange", "market", "listing"];

function fuzzyMatch(header: string, candidates: string[]): boolean {
  const h = header.toLowerCase().trim();
  return candidates.some((c) => h === c || h.includes(c));
}

function autoDetect(headers: string[]): { ticker: string; shares: string; price: string; exchange: string; priceIsTotal: boolean } {
  let ticker = "", shares = "", price = "", exchange = "";
  const bookValueCols: string[] = [];
  let priceIsTotal = false;
  for (const h of headers) {
    if (!ticker && fuzzyMatch(h, TICKER_NAMES)) ticker = h;
    if (!shares && fuzzyMatch(h, SHARES_NAMES)) shares = h;
    if (!price && fuzzyMatch(h, PRICE_NAMES)) price = h;
    if (fuzzyMatch(h, BOOK_VALUE_NAMES)) bookValueCols.push(h);
    if (!exchange && fuzzyMatch(h, EXCHANGE_NAMES)) exchange = h;
  }
  // If no per-share price column found, fall back to total book value (divided by shares later)
  // Prefer "(Market)" over "(CAD)" so US stocks use their native currency
  if (!price && bookValueCols.length > 0) {
    const marketCol = bookValueCols.find((c) => c.toLowerCase().includes("market"));
    price = marketCol ?? bookValueCols[0];
    priceIsTotal = true;
  }
  return { ticker, shares, price, exchange, priceIsTotal };
}

// ── Types ────────────────────────────────────────────────────

type Step = "pick" | "map" | "preview" | "conflict";

interface ParsedRow {
  ticker: string;
  shares: number;
  avg_cost: number;
  exchange: "US" | "TSX";
}

interface ConflictItem {
  ticker: string;
  existingId: string;
  newShares: number;
  newCost: number;
  resolution: "add" | "replace";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (firstId: string) => void;
}

export default function CsvImportDialog({ open, onOpenChange, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("pick");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<{ ticker: string; shares: string; price: string; exchange: string; priceIsTotal: boolean }>({ ticker: "", shares: "", price: "", exchange: "", priceIsTotal: false });
  const [defaultExchange, setDefaultExchange] = useState<"US" | "TSX">("US");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);

  const reset = () => {
    setStep("pick");
    setHeaders([]);
    setRawRows([]);
    setMapping({ ticker: "", shares: "", price: "", exchange: "", priceIsTotal: false });
    setParsedRows([]);
    setSkippedCount(0);
    setConflicts([]);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  // ── Step 1: File pick & parse ────────────────────────────
  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (!result.data.length || !result.meta.fields?.length) {
          toast.error("This file doesn't appear to be a valid CSV");
          return;
        }
        const hdrs = result.meta.fields;
        setHeaders(hdrs);
        setRawRows(result.data);
        const detected = autoDetect(hdrs);
        setMapping(detected);
        // If the three required fields detected, skip straight to preview
        if (detected.ticker && detected.shares && detected.price) {
          buildPreview(result.data, detected);
        } else {
          setStep("map");
        }
      },
      error: () => toast.error("This file doesn't appear to be a valid CSV"),
    });
    e.target.value = "";
  }, []);

  // ── Step 2→3: Build preview from mapping ─────────────────
  const buildPreview = (rows: Record<string, string>[], map: { ticker: string; shares: string; price: string; exchange: string; priceIsTotal?: boolean }) => {
    let skipped = 0;
    const parsed: ParsedRow[] = [];
    // Aggregate by ticker
    const agg = new Map<string, { totalShares: number; totalCost: number; exchange: "US" | "TSX" }>();

    for (const row of rows) {
      const ticker = (row[map.ticker] ?? "").toUpperCase().replace(/[^A-Z.]/g, "");
      const shares = parseFloat(row[map.shares]);
      const rawPrice = parseFloat(row[map.price]);
      // If the column is a total book value, compute per-share cost
      const price = map.priceIsTotal && shares > 0 ? rawPrice / shares : rawPrice;
      if (!ticker || isNaN(shares) || shares <= 0 || isNaN(price) || price <= 0) {
        skipped++;
        continue;
      }
      // Detect exchange from column if present, otherwise fall back to defaultExchange
      let exchange: "US" | "TSX" = defaultExchange;
      if (map.exchange && row[map.exchange]) {
        const raw = (row[map.exchange] ?? "").toUpperCase().trim();
        if (raw.includes("TSX") || raw.includes("CA") || raw.includes("TOR")) {
          exchange = "TSX";
        } else {
          exchange = "US";
        }
      }
      const existing = agg.get(ticker);
      if (existing) {
        const newTotal = existing.totalShares + shares;
        existing.totalCost = (existing.totalCost * existing.totalShares + price * shares) / newTotal;
        existing.totalShares = newTotal;
        // Keep the exchange from the first row seen for this ticker
      } else {
        agg.set(ticker, { totalShares: shares, totalCost: price, exchange });
      }
    }

    agg.forEach((v, ticker) => {
      parsed.push({ ticker, shares: v.totalShares, avg_cost: v.totalCost, exchange: v.exchange });
    });

    setParsedRows(parsed);
    setSkippedCount(skipped);
    setStep("preview");
  };

  // ── Step 3→4/import: Check conflicts & import ────────────
  const startImport = () => {
    const holdings = getHoldings();
    const found: ConflictItem[] = [];
    for (const row of parsedRows) {
      const existing = holdings.find((h) => h.ticker.toUpperCase() === row.ticker);
      if (existing) {
        found.push({ ticker: row.ticker, existingId: existing.id, newShares: row.shares, newCost: row.avg_cost, resolution: "add" });
      }
    }
    if (found.length) {
      setConflicts(found);
      setStep("conflict");
    } else {
      doImport([]);
    }
  };

  const doImport = (resolvedConflicts: ConflictItem[]) => {
    let firstId = "";
    const conflictMap = new Map(resolvedConflicts.map((c) => [c.ticker, c]));

    for (const row of parsedRows) {
      const conflict = conflictMap.get(row.ticker);
      if (conflict) {
        if (conflict.resolution === "replace") {
          editHolding(conflict.existingId, {
            shares: row.shares,
            avg_cost: row.avg_cost,
            initial_avg_cost: row.avg_cost,
            exchange: row.exchange,
          });
          if (!firstId) firstId = conflict.existingId;
        } else {
          // Add: merge as weighted average
          const existing = getHoldings().find((h) => h.id === conflict.existingId)!;
          const totalShares = existing.shares + row.shares;
          const newAvg = (existing.shares * existing.avg_cost + row.shares * row.avg_cost) / totalShares;
          editHolding(conflict.existingId, { shares: totalShares, avg_cost: newAvg });
          if (!firstId) firstId = conflict.existingId;
        }
      } else {
        const h = addHolding({
          ticker: row.ticker,
          exchange: row.exchange,
          shares: row.shares,
          avg_cost: row.avg_cost,
          fee: 0,
          fee_type: "flat",
          fee_value: 0,
        });
        if (!firstId) firstId = h.id;
      }
    }

    toast.success(`Imported ${parsedRows.length} stock${parsedRows.length !== 1 ? "s" : ""} from CSV`);
    if (skippedCount > 0) {
      toast.warning(`Skipped ${skippedCount} row${skippedCount !== 1 ? "s" : ""} with missing data`);
    }
    handleClose(false);
    onImported(firstId);
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <Dialog open={open && step !== "conflict"} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import from CSV
            </DialogTitle>
            <DialogDescription>
              {step === "pick" && "Select a CSV or TSV file exported from your brokerage."}
              {step === "map" && "Map your file's columns to the required fields."}
              {step === "preview" && "Review the data before importing."}
            </DialogDescription>
          </DialogHeader>

          {/* ── Pick file ──────────────────────────── */}
          {step === "pick" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="rounded-full bg-muted p-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Supports Wealthsimple, Questrade, TD Ameritrade, Robinhood, and generic CSV files
              </p>
              <Button onClick={() => fileRef.current?.click()} variant="outline">
                Choose File
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          )}

          {/* ── Column mapping ─────────────────────── */}
          {step === "map" && (
            <div className="space-y-4">
              {headers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Found columns: {headers.join(", ")}
                </p>
              )}
              <MappingSelect label="Ticker / Symbol *" value={mapping.ticker} headers={headers} onChange={(v) => setMapping((m) => ({ ...m, ticker: v }))} />
              <MappingSelect label="Shares / Quantity *" value={mapping.shares} headers={headers} onChange={(v) => setMapping((m) => ({ ...m, shares: v }))} />
              <MappingSelect label="Price / Avg Cost *" value={mapping.price} headers={headers} onChange={(v) => setMapping((m) => ({ ...m, price: v, priceIsTotal: false }))} />

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mapping.priceIsTotal}
                  onChange={(e) => setMapping((m) => ({ ...m, priceIsTotal: e.target.checked }))}
                  className="rounded border-border"
                />
                Column is total book value (divide by shares)
              </label>

              <MappingSelect label="Exchange column (optional)" value={mapping.exchange} headers={["(none)", ...headers]} onChange={(v) => setMapping((m) => ({ ...m, exchange: v === "(none)" ? "" : v }))} />

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Default exchange (used when no column present)</label>
                <div className="flex gap-3">
                  {(["US", "TSX"] as const).map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setDefaultExchange(ex)}
                      className={`flex-1 rounded-md border py-2 text-sm font-mono font-semibold transition-colors ${
                        defaultExchange === ex
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => { reset(); setStep("pick"); }}>Back</Button>
                <Button
                  disabled={!mapping.ticker || !mapping.shares || !mapping.price}
                  onClick={() => buildPreview(rawRows, mapping)}
                >
                  Preview
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* ── Preview ────────────────────────────── */}
          {step === "preview" && (
            <div className="space-y-4">
              {skippedCount > 0 && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Skipped {skippedCount} row{skippedCount !== 1 ? "s" : ""} with missing data
                </div>
              )}
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Ticker</th>
                      <th className="px-3 py-2 text-right font-medium">Shares</th>
                      <th className="px-3 py-2 text-right font-medium">Avg Cost</th>
                      <th className="px-3 py-2 text-right font-medium">Exchange</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((r) => (
                      <tr key={r.ticker} className="border-t border-border">
                        <td className="px-3 py-2 font-mono font-semibold">{r.ticker}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmt(r.shares)}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.exchange === "TSX" ? "C$" : "$"}{fmt(r.avg_cost)}</td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">{r.exchange}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {parsedRows.length} stock{parsedRows.length !== 1 ? "s" : ""} will be imported
              </p>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setStep("map")}>Back</Button>
                <Button onClick={startImport} disabled={parsedRows.length === 0}>
                  <Check className="mr-1.5 h-4 w-4" />
                  Import
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Conflict resolution ────────────────── */}
      <AlertDialog open={step === "conflict"} onOpenChange={(o) => { if (!o) { setStep("preview"); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existing stocks found</AlertDialogTitle>
            <AlertDialogDescription>
              Some stocks already exist in your portfolio. Choose how to handle each:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 my-2">
            {conflicts.map((c, i) => (
              <div key={c.ticker} className="flex items-center justify-between rounded-md border border-border p-3">
                <span className="font-mono font-semibold">{c.ticker}</span>
                <Select
                  value={c.resolution}
                  onValueChange={(v: "add" | "replace") => {
                    setConflicts((prev) => prev.map((item, idx) => idx === i ? { ...item, resolution: v } : item));
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add to existing</SelectItem>
                    <SelectItem value="replace">Replace</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStep("preview")}>Back</AlertDialogCancel>
            <AlertDialogAction onClick={() => doImport(conflicts)}>
              Confirm Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MappingSelect({ label, value, headers, onChange }: { label: string; value: string; headers: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select column…" />
        </SelectTrigger>
        <SelectContent>
          {headers.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
