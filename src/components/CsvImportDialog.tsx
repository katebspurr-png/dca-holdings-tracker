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
  "price",
];
const EXCHANGE_NAMES = ["exchange", "market", "listing"];

/** Column headers that represent total cost (book value), not per-share. We derive avg_cost = total / quantity. */
const BOOK_VALUE_TOTAL_NAMES = [
  "book value (market)",
  "book value (cad)",
  "book value",
  "cost basis",
  "total cost",
];

function isTotalCostColumn(header: string): boolean {
  if (!header) return false;
  const h = header.toLowerCase().trim();
  if (h.includes("per share")) return false;
  return BOOK_VALUE_TOTAL_NAMES.some((c) => h.includes(c));
}

/** Exclude "Market Price" from being used as average cost (it's current price, not cost). */
function isMarketPriceColumn(header: string): boolean {
  const h = header.toLowerCase().trim();
  return h === "market price" || (h.includes("market") && h.includes("price") && !h.includes("book"));
}

function fuzzyMatch(header: string, candidates: string[]): boolean {
  const h = header.toLowerCase().trim();
  return candidates.some((c) => h === c || h.includes(c));
}

function autoDetect(headers: string[]): { ticker: string; shares: string; price: string; exchange: string } {
  let ticker = "", shares = "", price = "", exchange = "";
  for (const h of headers) {
    if (!ticker && fuzzyMatch(h, TICKER_NAMES)) ticker = h;
    if (!shares && fuzzyMatch(h, SHARES_NAMES)) shares = h;
    if (!exchange && fuzzyMatch(h, EXCHANGE_NAMES)) exchange = h;
  }
  // Prefer total-cost columns (Book Value) over per-share; never use Market Price as cost.
  // Prefer "Book Value (Market)" (USD) first, then "Book Value (CAD)", then any other total-cost column.
  const hLower = (s: string) => s.toLowerCase().trim();
  for (const h of headers) {
    if (!price && isTotalCostColumn(h) && hLower(h).includes("book value (market)")) {
      price = h;
      break;
    }
  }
  if (!price) {
    for (const h of headers) {
      if (isTotalCostColumn(h) && hLower(h).includes("book value (cad)")) {
        price = h;
        break;
      }
    }
  }
  if (!price) {
    for (const h of headers) {
      if (isTotalCostColumn(h)) {
        price = h;
        break;
      }
    }
  }
  if (!price) {
    for (const h of headers) {
      if (fuzzyMatch(h, PRICE_NAMES) && !isMarketPriceColumn(h)) {
        price = h;
        break;
      }
    }
  }
  return { ticker, shares, price, exchange };
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
  const [mapping, setMapping] = useState<{ ticker: string; shares: string; price: string; exchange: string }>({ ticker: "", shares: "", price: "", exchange: "" });
  const [defaultExchange, setDefaultExchange] = useState<"US" | "TSX">("US");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);

  const reset = () => {
    setStep("pick");
    setHeaders([]);
    setRawRows([]);
    setMapping({ ticker: "", shares: "", price: "", exchange: "" });
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
        setStep("map");
      },
      error: () => toast.error("This file doesn't appear to be a valid CSV"),
    });
    e.target.value = "";
  }, []);

  // ── Step 2→3: Build preview from mapping ─────────────────
  const buildPreview = (rows: Record<string, string>[], map: { ticker: string; shares: string; price: string; exchange: string }) => {
    let skipped = 0;
    const parsed: ParsedRow[] = [];
    const costIsTotal = isTotalCostColumn(map.price);
    // Resolve cell value by header (handles BOM/trim/case mismatches between mapping and CSV row keys)
    const getCell = (row: Record<string, string>, header: string): string | undefined => {
      if (!header) return undefined;
      if (row[header] !== undefined && row[header] !== "") return row[header];
      const want = header.trim().toLowerCase();
      const key = Object.keys(row).find((k) => k.trim().toLowerCase() === want);
      return key ? row[key] : undefined;
    };
    // Aggregate by ticker (totalCost in agg is weighted average cost per share)
    const agg = new Map<string, { totalShares: number; totalCost: number; exchange: "US" | "TSX" }>();

    for (const row of rows) {
      const ticker = (getCell(row, map.ticker) ?? "").toUpperCase().replace(/[^A-Z.]/g, "");
      const shares = parseFloat(getCell(row, map.shares) ?? "");
      const costRaw = parseFloat(getCell(row, map.price) ?? "");
      if (!ticker || isNaN(shares) || shares <= 0 || isNaN(costRaw) || costRaw <= 0) {
        skipped++;
        continue;
      }
      const perShareCost = costIsTotal ? costRaw / shares : costRaw;
      // Detect exchange from column if present, otherwise fall back to defaultExchange
      let exchange: "US" | "TSX" = defaultExchange;
      if (map.exchange) {
        const raw = (getCell(row, map.exchange) ?? "").toUpperCase().trim();
        if (raw.includes("TSX") || raw.includes("CA") || raw.includes("TOR")) {
          exchange = "TSX";
        } else {
          exchange = "US";
        }
      }
      const existing = agg.get(ticker);
      if (existing) {
        const newTotal = existing.totalShares + shares;
        existing.totalCost = (existing.totalCost * existing.totalShares + perShareCost * shares) / newTotal;
        existing.totalShares = newTotal;
      } else {
        agg.set(ticker, { totalShares: shares, totalCost: perShareCost, exchange });
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
        <DialogContent
          className="max-h-[85vh] max-w-lg overflow-y-auto border-stitch-border bg-stitch-card text-white sm:rounded-[24px]"
          onInteractOutside={(e) => {
            if (step === "pick") e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <FileSpreadsheet className="h-5 w-5 text-stitch-accent" />
              Import from CSV
            </DialogTitle>
            <DialogDescription className="text-stitch-muted">
              {step === "pick" && "Select a CSV or TSV file exported from your brokerage."}
              {step === "map" && "Map your file's columns to the required fields."}
              {step === "preview" && "Review the data before importing."}
            </DialogDescription>
          </DialogHeader>

          {/* ── Pick file ──────────────────────────── */}
          {step === "pick" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="rounded-full bg-stitch-pill/50 p-4">
                <Upload className="h-8 w-8 text-stitch-accent" />
              </div>
              <p className="text-center text-sm text-stitch-muted">
                Supports Wealthsimple, Questrade, TD Ameritrade, Robinhood, and generic CSV files
              </p>
              <Button
                onClick={() => fileRef.current?.click()}
                variant="outline"
                className="border-stitch-border bg-stitch-pill text-stitch-muted-soft hover:bg-stitch-card hover:text-white"
              >
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
                <p className="text-xs text-stitch-muted">Found columns: {headers.join(", ")}</p>
              )}
              <MappingSelect label="Ticker / Symbol *" value={mapping.ticker} headers={headers} onChange={(v) => setMapping((m) => ({ ...m, ticker: v }))} />
              <MappingSelect label="Shares / Quantity *" value={mapping.shares} headers={headers} onChange={(v) => setMapping((m) => ({ ...m, shares: v }))} />
              <MappingSelect label="Price / Avg Cost *" value={mapping.price} headers={headers} onChange={(v) => setMapping((m) => ({ ...m, price: v }))} />
              {mapping.price && isTotalCostColumn(mapping.price) && (
                <p className="text-xs text-stitch-muted">Using as total cost; average cost = total ÷ quantity.</p>
              )}

              <MappingSelect label="Exchange column (optional)" value={mapping.exchange} headers={["(none)", ...headers]} onChange={(v) => setMapping((m) => ({ ...m, exchange: v === "(none)" ? "" : v }))} />

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white">
                  Default exchange (used when no column present)
                </label>
                <div className="flex gap-3">
                  {(["US", "TSX"] as const).map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setDefaultExchange(ex)}
                      className={`flex-1 rounded-lg border py-2 font-mono text-sm font-semibold transition-colors ${
                        defaultExchange === ex
                          ? "border-stitch-accent bg-stitch-accent/15 text-stitch-accent"
                          : "border-stitch-border text-stitch-muted hover:text-white"
                      }`}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="ghost"
                  className="text-stitch-muted hover:bg-stitch-pill/50 hover:text-white"
                  onClick={() => {
                    reset();
                    setStep("pick");
                  }}
                >
                  Back
                </Button>
                <Button
                  disabled={!mapping.ticker || !mapping.shares || !mapping.price}
                  className="bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
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
              {mapping.price && isTotalCostColumn(mapping.price) && (
                <p className="text-center text-xs text-stitch-muted">
                  Using &quot;{mapping.price}&quot; as total cost; average cost = total ÷ quantity.
                </p>
              )}
              {skippedCount > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  Skipped {skippedCount} row{skippedCount !== 1 ? "s" : ""} with missing data
                </div>
              )}
              <div className="overflow-hidden rounded-lg border border-stitch-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stitch-pill/40 text-stitch-muted">
                      <th className="px-3 py-2 text-left font-medium">Ticker</th>
                      <th className="px-3 py-2 text-right font-medium">Shares</th>
                      <th className="px-3 py-2 text-right font-medium">Avg Cost</th>
                      <th className="px-3 py-2 text-right font-medium">Exchange</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((r) => (
                      <tr key={r.ticker} className="border-t border-stitch-border">
                        <td className="px-3 py-2 font-mono font-semibold text-white">{r.ticker}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmt(r.shares)}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {r.exchange === "TSX" ? "C$" : "$"}
                          {fmt(r.avg_cost)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-stitch-muted">{r.exchange}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-center text-xs text-stitch-muted">
                {parsedRows.length} stock{parsedRows.length !== 1 ? "s" : ""} will be imported
              </p>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="ghost"
                  className="text-stitch-muted hover:bg-stitch-pill/50 hover:text-white"
                  onClick={() => setStep("map")}
                >
                  Back
                </Button>
                <Button
                  onClick={startImport}
                  disabled={parsedRows.length === 0}
                  className="bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
                >
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
        <AlertDialogContent className="border-stitch-border bg-stitch-card text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Existing stocks found</AlertDialogTitle>
            <AlertDialogDescription className="text-stitch-muted">
              Some stocks already exist in your portfolio. Choose how to handle each:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2 space-y-3">
            {conflicts.map((c, i) => (
              <div
                key={c.ticker}
                className="flex items-center justify-between rounded-lg border border-stitch-border bg-stitch-pill/30 p-3"
              >
                <span className="font-mono font-semibold text-white">{c.ticker}</span>
                <Select
                  value={c.resolution}
                  onValueChange={(v: "add" | "replace") => {
                    setConflicts((prev) => prev.map((item, idx) => (idx === i ? { ...item, resolution: v } : item)));
                  }}
                >
                  <SelectTrigger className="w-40 border-stitch-border bg-stitch-pill text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[60] border-stitch-border bg-stitch-card text-white">
                    <SelectItem value="add">Add to existing</SelectItem>
                    <SelectItem value="replace">Replace</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-stitch-border bg-transparent text-white hover:bg-stitch-pill"
              onClick={() => setStep("preview")}
            >
              Back
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-stitch-accent text-black hover:bg-stitch-accent/90"
              onClick={() => doImport(conflicts)}
            >
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
      <label className="text-sm font-medium text-white">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="border-stitch-border bg-stitch-pill text-white focus:ring-stitch-accent">
          <SelectValue placeholder="Select column…" />
        </SelectTrigger>
        <SelectContent className="z-[60] border-stitch-border bg-stitch-card text-white">
          {headers.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
