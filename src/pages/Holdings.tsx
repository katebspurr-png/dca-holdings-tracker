import { useState, useCallback, useMemo, type KeyboardEvent } from "react";
import Onboarding, { getOnboardingDone } from "@/components/onboarding";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  TrendingDown,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  ArrowUpDown,
  CheckSquare,
  Square,
  X,
  MoreHorizontal,
  SlidersHorizontal,
  Gauge,
  Zap,
  ArrowDownRight,
  LayoutGrid,
  List,
} from "lucide-react";
import { useRefreshPrices, formatLastRefreshed } from "@/hooks/use-refresh-prices";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import HoldingFormDialog from "@/components/HoldingFormDialog";
import CsvImportDialog from "@/components/CsvImportDialog";
import {
  getHoldings,
  addHolding,
  editHolding,
  removeHolding,
  getScenariosForHolding,
  type Holding,
  type Scenario,
  currencyPrefix,
  apiTicker,
} from "@/lib/storage";
import { fetchStockPrice } from "@/lib/stock-price";
import { getCachedPrice } from "@/lib/price-cache";
import { toast } from "sonner";
import { useSimFees } from "@/contexts/SimFeesContext";
import {
  selectMostEfficientLadderStep,
  holdingFeeOpts,
  type DcaRow,
} from "@/lib/dca-sim";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const SORT_KEY = "dca-holdings-sort";
const LAYOUT_KEY = "dca-holdings-layout";
const OPPORTUNITIES_EXPANDED_KEY = "dca-opportunities-expanded";

type SortMode =
  | "az"
  | "za"
  | "position"
  | "position_small"
  | "loss"
  | "gain"
  | "loss_pct"
  | "gain_pct";

const SORT_LABELS: Record<SortMode, string> = {
  az: "A → Z",
  za: "Z → A",
  position: "Largest Position",
  position_small: "Smallest Position",
  loss: "Biggest Loss ($)",
  gain: "Biggest Gain ($)",
  loss_pct: "Biggest Loss %",
  gain_pct: "Biggest Gain %",
};

function parseStoredSort(): SortMode {
  const v = localStorage.getItem(SORT_KEY);
  if (v && Object.prototype.hasOwnProperty.call(SORT_LABELS, v)) return v as SortMode;
  return "az";
}

type HoldingsLayout = "grid" | "list";

function parseStoredLayout(): HoldingsLayout {
  const v = localStorage.getItem(LAYOUT_KEY);
  if (v === "list" || v === "grid") return v;
  return "grid";
}

const AVATAR_PALETTE = [
  "bg-white text-black",
  "bg-[#76b900] text-white",
  "bg-[#627eea] text-white",
  "bg-[#e31937] text-white",
] as const;

function avatarClassForTicker(ticker: string): string {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h + ticker.charCodeAt(i) * (i + 1)) % 997;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]!;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type PnlInfo = { pnl: number; pnlPct: number };

function HoldingPortfolioCard({
  holding: h,
  layout,
  price,
  scenario,
  pnl,
  selectMode,
  isSelected,
  fetchingTickers,
  onRowActivate,
  onStrategy,
  onFetchPrice,
  onEdit,
  onDelete,
}: {
  holding: Holding;
  layout: HoldingsLayout;
  price: number | null;
  scenario: Scenario | null;
  pnl: PnlInfo | null;
  selectMode: boolean;
  isSelected: boolean;
  fetchingTickers: Set<string>;
  onRowActivate: () => void;
  onStrategy: () => void;
  onFetchPrice: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ex = (h.exchange ?? "US") as "US" | "TSX";
  const cp = currencyPrefix(ex);
  const underwater = price != null && price < h.avg_cost;
  const sliderColor = !price ? "text-stitch-muted" : underwater ? "text-stitch-accent" : "text-stitch-danger";

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onRowActivate();
    }
  };

  if (layout === "list") {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={onRowActivate}
        onKeyDown={onKeyDown}
        className={cn(
          "relative flex flex-col rounded-2xl border border-stitch-border bg-stitch-card p-3 shadow-md outline-none transition-opacity",
          isSelected && "ring-2 ring-stitch-accent/60",
        )}
      >
        {selectMode && (
          <div className="absolute right-2 top-2">
            {isSelected ? (
              <CheckSquare className="h-5 w-5 text-stitch-accent" />
            ) : (
              <Square className="h-5 w-5 text-stitch-muted/50" />
            )}
          </div>
        )}
        <div className={cn("flex min-w-0 items-start gap-2", selectMode && "pr-8")}>
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                avatarClassForTicker(h.ticker),
              )}
            >
              {h.ticker.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-[15px] font-bold">{h.ticker}</span>
                <span className="text-[15px] font-semibold tabular-nums">
                  {price != null ? `${cp}${fmt(price)}` : "—"}
                </span>
                {pnl != null && (
                  <span
                    className={cn(
                      "text-[12px] font-medium tabular-nums",
                      pnl.pnl >= 0 ? "text-stitch-accent" : "text-stitch-danger",
                    )}
                  >
                    {pnl.pnl >= 0 ? "+" : ""}
                    {cp}
                    {fmt(pnl.pnl)} ({pnl.pnlPct >= 0 ? "+" : ""}
                    {pnl.pnlPct.toFixed(1)}%)
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-stitch-muted">
                Avg {cp}
                {fmt(h.avg_cost)}
              </p>
              {!selectMode && price == null && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFetchPrice();
                  }}
                  disabled={fetchingTickers.has(h.ticker)}
                  className="mt-1 text-left text-[11px] font-medium text-stitch-accent hover:underline"
                >
                  {fetchingTickers.has(h.ticker) ? "Loading…" : "Get price"}
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStrategy();
                }}
                className="mt-1 block max-w-full truncate text-left text-[11px] font-semibold text-stitch-accent hover:underline"
              >
                Target: {scenario ? `${cp}${fmt(scenario.new_avg_cost)}` : "Plan in Strategy"}
              </button>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 pt-0.5">
            <button
              type="button"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onStrategy();
              }}
              aria-label="Strategy"
            >
              <SlidersHorizontal className={`h-4 w-4 ${sliderColor}`} />
            </button>
            <ChevronRight className="h-4 w-4 shrink-0 text-stitch-muted/40" />
          </div>
        </div>
        {!selectMode && (
          <div className="mt-2 flex gap-2 border-t border-stitch-border/50 pt-2">
            <button
              type="button"
              className="text-[11px] text-stitch-muted hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="mr-1 inline h-3 w-3" />
              Edit
            </button>
            <button
              type="button"
              className="text-[11px] text-stitch-danger/90 hover:text-stitch-danger"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="mr-1 inline h-3 w-3" />
              Delete
            </button>
          </div>
        )}
      </article>
    );
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onRowActivate}
      onKeyDown={onKeyDown}
      className={cn(
        "relative flex flex-col rounded-[24px] border border-stitch-border bg-stitch-card p-4 shadow-md outline-none transition-opacity",
        isSelected && "ring-2 ring-stitch-accent/60",
      )}
    >
      {selectMode && (
        <div className="absolute right-2 top-2">
          {isSelected ? (
            <CheckSquare className="h-5 w-5 text-stitch-accent" />
          ) : (
            <Square className="h-5 w-5 text-stitch-muted/50" />
          )}
        </div>
      )}
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${avatarClassForTicker(h.ticker)}`}
          >
            {h.ticker.slice(0, 1)}
          </div>
          <span className="text-[15px] font-bold">{h.ticker}</span>
        </div>
        <button
          type="button"
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onStrategy();
          }}
          aria-label="Strategy"
        >
          <SlidersHorizontal className={`h-4 w-4 ${sliderColor}`} />
        </button>
      </div>

      <p className="mb-2 text-[22px] font-bold">{price != null ? `${cp}${fmt(price)}` : "—"}</p>

      {!selectMode && price == null && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFetchPrice();
          }}
          disabled={fetchingTickers.has(h.ticker)}
          className="mb-2 text-left text-[11px] font-medium text-stitch-accent hover:underline"
        >
          {fetchingTickers.has(h.ticker) ? "Loading…" : "Get price"}
        </button>
      )}

      <div className="mb-3 flex items-center justify-between text-[13px] text-stitch-muted">
        <span>Your Average:</span>
        <span className="text-stitch-muted-soft">
          {cp}
          {fmt(h.avg_cost)}
        </span>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onStrategy();
        }}
        className="mb-3 flex w-full items-center justify-between rounded-xl bg-stitch-accent px-3 py-2 text-left text-[13px] font-semibold text-black"
      >
        <span className="leading-tight">
          Target Average:
          <br />
          <span className="text-[15px]">
            {scenario ? `${cp}${fmt(scenario.new_avg_cost)}` : "Plan in Strategy"}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0" />
      </button>

      <p className="flex-1 text-[12px] leading-tight text-stitch-muted">
        Buy to Reach Target:
        <br />
        {scenario && scenario.buy_price != null ? (
          <>
            <span className="text-stitch-muted-soft">
              {fmt(scenario.shares_to_buy)} shares at {cp}
              {fmt(scenario.buy_price)}
            </span>
            <br />
            {underwater && price != null && price > 0 && (
              <span className="text-stitch-accent">
                (+{(((h.avg_cost - price) / price) * 100).toFixed(1)}% vs. market)
              </span>
            )}
          </>
        ) : (
          <span className="text-stitch-muted-soft/80">Save a scenario on the Strategy tab</span>
        )}
      </p>

      {!selectMode && (
        <div className="mt-2 flex gap-2 border-t border-stitch-border/50 pt-2">
          <button
            type="button"
            className="text-[11px] text-stitch-muted hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="mr-1 inline h-3 w-3" />
            Edit
          </button>
          <button
            type="button"
            className="text-[11px] text-stitch-danger/90 hover:text-stitch-danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="mr-1 inline h-3 w-3" />
            Delete
          </button>
        </div>
      )}
    </article>
  );
}

export default function Holdings() {
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(() => !getOnboardingDone());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);
  const [deleting, setDeleting] = useState<Holding | null>(null);
  const [tick, setTick] = useState(0);
  const [csvOpen, setCsvOpen] = useState(false);
  const { refreshing: refreshingAll, refreshAll, lastRefreshed } = useRefreshPrices();
  const [sortMode, setSortMode] = useState<SortMode>(parseStoredSort);
  const [holdingsLayout, setHoldingsLayout] = useState<HoldingsLayout>(parseStoredLayout);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { includeFees, setIncludeFees } = useSimFees();

  const refresh = () => setTick((t) => t + 1);

  const holdings = getHoldings();

  const livePrices = useMemo(() => {
    const prices: Record<string, number | null> = {};
    holdings.forEach((h) => {
      prices[h.id] = getCachedPrice(h.ticker, h.exchange ?? "US");
    });
    return prices;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, tick]);

  const latestDca = useMemo(() => {
    const map: Record<string, Scenario | null> = {};
    holdings.forEach((h) => {
      const scenarios = getScenariosForHolding(h.id);
      map[h.id] = scenarios.length > 0 ? scenarios[0]! : null;
    });
    return map;
  }, [holdings, tick]);

  const getPnl = (h: Holding) => {
    const price = livePrices[h.id];
    if (price == null) return null;
    const pnl = (price - h.avg_cost) * h.shares;
    const pnlPct = h.avg_cost > 0 ? ((price - h.avg_cost) / h.avg_cost) * 100 : 0;
    return { pnl, pnlPct, price };
  };

  const sortedHoldings = useMemo(() => {
    const sorted = [...holdings];
    switch (sortMode) {
      case "az":
        sorted.sort((a, b) => a.ticker.localeCompare(b.ticker));
        break;
      case "za":
        sorted.sort((a, b) => b.ticker.localeCompare(a.ticker));
        break;
      case "position":
        sorted.sort((a, b) => b.shares * b.avg_cost - a.shares * a.avg_cost);
        break;
      case "position_small":
        sorted.sort((a, b) => a.shares * a.avg_cost - b.shares * b.avg_cost);
        break;
      case "loss": {
        sorted.sort((a, b) => {
          const pa = getPnl(a);
          const pb = getPnl(b);
          return (pa?.pnl ?? 0) - (pb?.pnl ?? 0);
        });
        break;
      }
      case "gain": {
        sorted.sort((a, b) => {
          const pa = getPnl(a);
          const pb = getPnl(b);
          return (pb?.pnl ?? 0) - (pa?.pnl ?? 0);
        });
        break;
      }
      case "loss_pct": {
        sorted.sort((a, b) => {
          const pa = getPnl(a);
          const pb = getPnl(b);
          return (pa?.pnlPct ?? 0) - (pb?.pnlPct ?? 0);
        });
        break;
      }
      case "gain_pct": {
        sorted.sort((a, b) => {
          const pa = getPnl(a);
          const pb = getPnl(b);
          return (pb?.pnlPct ?? 0) - (pa?.pnlPct ?? 0);
        });
        break;
      }
    }
    return sorted;
  }, [holdings, sortMode, livePrices]);

  const handleSortChange = (mode: SortMode) => {
    setSortMode(mode);
    localStorage.setItem(SORT_KEY, mode);
  };

  const handleLayoutChange = (layout: HoldingsLayout) => {
    setHoldingsLayout(layout);
    localStorage.setItem(LAYOUT_KEY, layout);
  };

  const usdHoldings = holdings.filter((h) => (h.exchange ?? "US") === "US");
  const cadHoldings = holdings.filter((h) => (h.exchange ?? "US") === "TSX");
  const totalUsdInvested = usdHoldings.reduce((sum, h) => sum + h.shares * h.avg_cost, 0);
  const totalCadInvested = cadHoldings.reduce((sum, h) => sum + h.shares * h.avg_cost, 0);
  const hasUsdPrice = usdHoldings.some((h) => livePrices[h.id] != null);
  const hasCadPrice = cadHoldings.some((h) => livePrices[h.id] != null);

  const usdValue = usdHoldings.reduce((sum, h) => {
    const p = livePrices[h.id];
    return sum + (p != null ? h.shares * p : h.shares * h.avg_cost);
  }, 0);
  const cadValue = cadHoldings.reduce((sum, h) => {
    const p = livePrices[h.id];
    return sum + (p != null ? h.shares * p : h.shares * h.avg_cost);
  }, 0);
  const usdPnl = usdValue - totalUsdInvested;
  const cadPnl = cadValue - totalCadInvested;
  const usdPnlPct = totalUsdInvested > 0 ? (usdPnl / totalUsdInvested) * 100 : 0;
  const cadPnlPct = totalCadInvested > 0 ? (cadPnl / totalCadInvested) * 100 : 0;

  const refreshAllPrices = useCallback(async () => {
    const result = await refreshAll(() => refresh());
    if (result.failed.length === 0) {
      toast.success("Market prices refreshed");
    } else if (result.success > 0) {
      toast.success(`Refreshed ${result.success} of ${result.total} prices. Failed: ${result.failed.join(", ")}`);
    } else {
      toast.error("Could not refresh prices");
    }
  }, [refreshAll]);

  const [fetchingTickers, setFetchingTickers] = useState<Set<string>>(new Set());
  const fetchPrice = useCallback(async (ticker: string, exchange: string) => {
    const sym = apiTicker(ticker, exchange as "US" | "TSX");
    setFetchingTickers((prev) => new Set(prev).add(ticker));
    const result = await fetchStockPrice(sym, { bypassCache: true });
    setFetchingTickers((prev) => {
      const n = new Set(prev);
      n.delete(ticker);
      return n;
    });
    if (result.ok) {
      refresh();
    } else {
      toast.error(`${ticker}: ${"error" in result ? result.error : "Price unavailable"}`);
    }
  }, []);

  const handleCreate = (data: Omit<Holding, "id" | "created_at" | "initial_avg_cost">) => {
    addHolding(data);
    setFormOpen(false);
    toast.success("Stock added");
    refresh();
  };

  const handleUpdate = (data: Omit<Holding, "id" | "created_at" | "initial_avg_cost">) => {
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
    toast.success("Stock deleted");
    refresh();
  };

  const handleBulkDelete = () => {
    selected.forEach((id) => removeHolding(id));
    toast.success(`Deleted ${selected.size} holding${selected.size !== 1 ? "s" : ""}`);
    setSelected(new Set());
    setSelectMode(false);
    setBulkDeleting(false);
    refresh();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === holdings.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(holdings.map((h) => h.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const fmtUsd = (n: number) => `$${fmt(n)}`;
  const fmtCad = (n: number) => `C$${fmt(n)}`;

  return (
    <div className="relative min-h-[max(884px,100dvh)] overflow-x-hidden bg-stitch-bg pb-28 font-sans text-white antialiased">
      {showOnboarding && (
        <Onboarding onDone={() => setShowOnboarding(false)} />
      )}
      {holdings.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 pb-24 pt-20 text-center">
          <div className="mb-4 rounded-full bg-stitch-card p-4 ring-1 ring-stitch-border">
            <TrendingDown className="h-10 w-10 text-stitch-muted" />
          </div>
          <h3 className="text-lg font-semibold text-white">No holdings yet</h3>
          <p className="mt-2 max-w-sm text-sm text-stitch-muted">
            Add your first holding to start tracking average cost and DCA scenarios.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              className="bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              size="lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Stock
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-stitch-border bg-stitch-pill text-stitch-muted-soft hover:bg-stitch-card hover:text-white"
              onClick={() => setCsvOpen(true)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
          </div>
        </div>
      ) : (
        <>
          <header className="mb-8 px-4 pt-12 text-center sm:px-6 md:px-8">
            <h1 className="text-3xl font-bold leading-tight tracking-tight">
              Modernized DCA
              <br />
              Portfolio Dashboard
            </h1>
          </header>

          <main className="relative z-10 mx-auto flex max-w-md flex-1 flex-col gap-4 px-4 sm:px-6 md:px-8">
            {selectMode && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stitch-border bg-stitch-card px-3 py-2 text-xs">
                <button type="button" onClick={toggleSelectAll} className="text-stitch-muted-soft hover:text-white">
                  {selected.size === holdings.length ? "Deselect all" : "Select all"}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={selected.size === 0}
                    onClick={() => setBulkDeleting(true)}
                    className="font-medium text-stitch-danger disabled:opacity-40"
                  >
                    Delete ({selected.size})
                  </button>
                  <button type="button" onClick={exitSelectMode} className="text-stitch-muted hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Total Portfolio */}
            <section className="relative overflow-hidden rounded-[32px] border border-stitch-border bg-stitch-card p-6 shadow-lg">
              <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-stitch-accent/10 blur-3xl" />
              <div className="relative z-10 mb-4 flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-white">Total Portfolio</h2>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-stitch-pill ring-0 focus:outline-none"
                      aria-label="Portfolio menu"
                    >
                      <MoreHorizontal className="h-4 w-4 text-stitch-accent" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="z-50 min-w-[11rem] rounded-2xl border-stitch-border bg-stitch-card p-1.5 text-white shadow-lg"
                  >
                    <DropdownMenuItem
                      className="rounded-xl focus:bg-stitch-pill focus:text-white"
                      onClick={() => refreshAllPrices()}
                      disabled={refreshingAll}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${refreshingAll ? "animate-spin" : ""}`} />
                      Refresh prices
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-xl focus:bg-stitch-pill focus:text-white"
                      onClick={() => navigate("/update-prices")}
                    >
                      Update Prices page
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-xl focus:bg-stitch-pill focus:text-white"
                      onClick={() => navigate("/what-if")}
                    >
                      What-If scenarios
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-xl focus:bg-stitch-pill focus:text-white"
                      onClick={() => navigate("/progress")}
                    >
                      Progress (vs initial snapshot)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-xl focus:bg-stitch-pill focus:text-white"
                      onClick={() => setCsvOpen(true)}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Import CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-xl focus:bg-stitch-pill focus:text-white"
                      onClick={() => setSelectMode(true)}
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      Select holdings
                    </DropdownMenuItem>
                    {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                      <DropdownMenuItem
                        key={mode}
                        className="rounded-xl focus:bg-stitch-pill focus:text-white"
                        onClick={() => handleSortChange(mode)}
                      >
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        Sort: {SORT_LABELS[mode]}
                        {sortMode === mode ? " ✓" : ""}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {usdHoldings.length > 0 && (
                <div className="relative z-10 mb-5 rounded-2xl border border-stitch-border/60 bg-stitch-pill/30 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-stitch-muted mb-2">US positions</p>
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="mb-0.5 text-[13px] text-stitch-muted">Value</p>
                      <p className="text-[22px] font-bold leading-none text-stitch-accent">
                        {hasUsdPrice ? fmtUsd(usdValue) : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="mb-0.5 text-[13px] text-stitch-muted">Invested</p>
                      <p className="text-[16px] font-medium text-white">{fmtUsd(totalUsdInvested)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-stitch-border/40 pt-2">
                    <span className="text-[13px] text-stitch-muted">P&amp;L</span>
                    <span
                      className={`text-[15px] font-medium ${
                        !hasUsdPrice ? "text-stitch-muted" : usdPnl >= 0 ? "text-stitch-accent" : "text-stitch-danger"
                      }`}
                    >
                      {hasUsdPrice
                        ? `${usdPnl >= 0 ? "+" : ""}${fmtUsd(usdPnl)} (${usdPnlPct >= 0 ? "+" : ""}${usdPnlPct.toFixed(2)}%)`
                        : "—"}
                    </span>
                  </div>
                </div>
              )}

              {cadHoldings.length > 0 && (
                <div className="relative z-10 mb-5 rounded-2xl border border-stitch-border/60 bg-stitch-pill/30 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-stitch-muted mb-2">CAD (TSX) positions</p>
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="mb-0.5 text-[13px] text-stitch-muted">Value</p>
                      <p className="text-[22px] font-bold leading-none text-stitch-accent">
                        {hasCadPrice ? fmtCad(cadValue) : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="mb-0.5 text-[13px] text-stitch-muted">Invested</p>
                      <p className="text-[16px] font-medium text-white">{fmtCad(totalCadInvested)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-stitch-border/40 pt-2">
                    <span className="text-[13px] text-stitch-muted">P&amp;L</span>
                    <span
                      className={`text-[15px] font-medium ${
                        !hasCadPrice ? "text-stitch-muted" : cadPnl >= 0 ? "text-stitch-accent" : "text-stitch-danger"
                      }`}
                    >
                      {hasCadPrice
                        ? `${cadPnl >= 0 ? "+" : ""}${fmtCad(cadPnl)} (${cadPnlPct >= 0 ? "+" : ""}${cadPnlPct.toFixed(2)}%)`
                        : "—"}
                    </span>
                  </div>
                </div>
              )}

              {usdHoldings.length > 0 && cadHoldings.length > 0 && (
                <p className="relative z-10 mb-3 text-[10px] leading-relaxed text-stitch-muted/80">
                  US and Canadian totals are shown separately — they are not converted or summed into one number.
                </p>
              )}
              {lastRefreshed && (
                <p className="relative z-10 mt-3 text-[10px] text-stitch-muted/70">
                  Updated {formatLastRefreshed(lastRefreshed)}
                </p>
              )}
            </section>

            <div className="flex items-center justify-between rounded-2xl border border-stitch-border bg-stitch-pill px-4 py-3">
              <Label htmlFor="portfolio-sim-fees" className="cursor-pointer text-xs text-stitch-muted">
                Include fees in portfolio simulations
              </Label>
              <Switch id="portfolio-sim-fees" checked={includeFees} onCheckedChange={setIncludeFees} />
            </div>

            <MostEfficientStep holdings={holdings} livePrices={livePrices} navigate={navigate} />

            <DcaOpportunities holdings={holdings} livePrices={livePrices} navigate={navigate} />

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stitch-border bg-stitch-pill px-3 py-2.5">
              <h2 className="text-sm font-semibold text-white">Holdings</h2>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="flex rounded-xl border border-stitch-border/80 bg-stitch-card/50 p-0.5">
                  <button
                    type="button"
                    aria-label="Grid view"
                    aria-pressed={holdingsLayout === "grid"}
                    className={cn(
                      "rounded-lg p-2 transition-colors",
                      holdingsLayout === "grid"
                        ? "bg-stitch-pill text-white"
                        : "text-stitch-muted hover:text-white",
                    )}
                    onClick={() => handleLayoutChange("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="List view"
                    aria-pressed={holdingsLayout === "list"}
                    className={cn(
                      "rounded-lg p-2 transition-colors",
                      holdingsLayout === "list"
                        ? "bg-stitch-pill text-white"
                        : "text-stitch-muted hover:text-white",
                    )}
                    onClick={() => handleLayoutChange("list")}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 border-stitch-border bg-stitch-card px-3 text-xs text-stitch-muted-soft hover:bg-stitch-pill hover:text-white"
                    >
                      <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
                      Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="z-50 min-w-[12rem] rounded-2xl border-stitch-border bg-stitch-card p-1.5 text-white shadow-lg"
                  >
                    {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                      <DropdownMenuItem
                        key={mode}
                        className="rounded-xl focus:bg-stitch-pill focus:text-white"
                        onClick={() => handleSortChange(mode)}
                      >
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        {SORT_LABELS[mode]}
                        {sortMode === mode ? " ✓" : ""}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <section
              className={holdingsLayout === "grid" ? "grid grid-cols-2 gap-4" : "flex flex-col gap-2"}
            >
              {sortedHoldings.map((h) => {
                const ex = (h.exchange ?? "US") as "US" | "TSX";
                const price = livePrices[h.id];
                const scenario = latestDca[h.id];
                const isSelected = selected.has(h.id);
                const pnlFull = getPnl(h);
                const pnl = pnlFull ? { pnl: pnlFull.pnl, pnlPct: pnlFull.pnlPct } : null;

                return (
                  <HoldingPortfolioCard
                    key={h.id}
                    holding={h}
                    layout={holdingsLayout}
                    price={price}
                    scenario={scenario}
                    pnl={pnl}
                    selectMode={selectMode}
                    isSelected={isSelected}
                    fetchingTickers={fetchingTickers}
                    onRowActivate={() =>
                      selectMode ? toggleSelect(h.id) : navigate(`/holdings/${h.id}`)
                    }
                    onStrategy={() => navigate(`/holdings/${h.id}?tab=strategy`)}
                    onFetchPrice={() => fetchPrice(h.ticker, ex)}
                    onEdit={() => {
                      setEditing(h);
                      setFormOpen(true);
                    }}
                    onDelete={() => setDeleting(h)}
                  />
                );
              })}
            </section>
          </main>

          <div className="fixed bottom-24 right-4 z-50 sm:right-6 md:right-8">
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="flex items-center gap-2 rounded-full border border-stitch-border bg-stitch-pill py-3 pl-4 pr-5 shadow-xl transition-colors hover:bg-[#3a3a3c]"
            >
              <Plus className="h-5 w-5 text-stitch-accent" strokeWidth={2.5} />
              <span className="font-semibold text-stitch-accent">Add Stock</span>
            </button>
          </div>
        </>
      )}

      <HoldingFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        initial={editing}
        loading={false}
        onSubmit={(data) => (editing ? handleUpdate(data) : handleCreate(data))}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="border-stitch-border bg-stitch-card text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.ticker} and all its data?</AlertDialogTitle>
            <AlertDialogDescription className="text-stitch-muted">
              This will permanently delete the stock position and all saved calculations for {deleting?.ticker}. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-stitch-border bg-transparent text-white hover:bg-stitch-pill">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && handleDelete(deleting.id)}
              className="bg-stitch-danger text-white hover:bg-stitch-danger/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleting} onOpenChange={(open) => !open && setBulkDeleting(false)}>
        <AlertDialogContent className="border-stitch-border bg-stitch-card text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selected.size} holding{selected.size !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-stitch-muted">
              This will permanently delete{" "}
              {selected.size === holdings.length
                ? "all holdings"
                : `${selected.size} selected holding${selected.size !== 1 ? "s" : ""}`}{" "}
              and their saved calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-stitch-border bg-transparent text-white hover:bg-stitch-pill">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-stitch-danger text-white hover:bg-stitch-danger/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} onImported={() => refresh()} />
    </div>
  );
}

/* ── Strategy opportunities (portfolio rank) ───────────── */
function DcaOpportunities({
  holdings,
  livePrices,
  navigate,
}: {
  holdings: Holding[];
  livePrices: Record<string, number | null>;
  navigate: (path: string) => void;
}) {
  const { includeFees } = useSimFees();
  const [showAll, setShowAll] = useState(false);
  const [sectionExpanded, setSectionExpanded] = useState(() => {
    const s = localStorage.getItem(OPPORTUNITIES_EXPANDED_KEY);
    if (s === "0" || s === "false") return false;
    return true;
  });

  const toggleSectionExpanded = () => {
    setSectionExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(OPPORTUNITIES_EXPANDED_KEY, next ? "1" : "0");
      return next;
    });
  };

  const scored = useMemo(() => {
    const rows: { holding: Holding; price: number; step: DcaRow }[] = [];
    for (const h of holdings) {
      const price = livePrices[h.id];
      if (price == null || price <= 0 || price >= h.avg_cost) continue;
      const step = selectMostEfficientLadderStep(
        h.shares,
        h.avg_cost,
        price,
        holdingFeeOpts(h, includeFees)
      );
      if (!step || step.avgImprovement <= 0) continue;
      rows.push({ holding: h, price, step });
    }
    const maxEff = Math.max(...rows.map((r) => r.step.improvementPerDollar), 1e-12);
    return rows
      .map((r) => ({
        ...r,
        rankScore: Math.round((r.step.improvementPerDollar / maxEff) * 100),
      }))
      .sort((a, b) => b.rankScore - a.rankScore);
  }, [holdings, livePrices, includeFees]);

  if (holdings.length === 0) return null;

  const hasRanked = scored.length > 0;
  const top = scored[0];
  const rest = scored.slice(1);
  const visibleRest = showAll ? rest : rest.slice(0, 3);

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-stitch-border bg-stitch-card p-6 shadow-lg">
      <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-stitch-accent/10 blur-3xl" />
      <div className="relative z-10">
        <button
          type="button"
          onClick={toggleSectionExpanded}
          className="mb-2 flex w-full items-center justify-between gap-2 rounded-xl py-1 text-left transition-colors hover:bg-stitch-pill/20"
        >
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 shrink-0 text-stitch-accent" />
            <h2 className="text-[17px] font-semibold text-white">Portfolio simulations (relative scores)</h2>
          </div>
          {sectionExpanded ? (
            <ChevronDown className="h-5 w-5 shrink-0 text-stitch-muted" aria-hidden />
          ) : (
            <ChevronRight className="h-5 w-5 shrink-0 text-stitch-muted" aria-hidden />
          )}
        </button>

        {!sectionExpanded && (
          <p className="text-[11px] leading-relaxed text-stitch-muted">
            {hasRanked
              ? `${scored.length} modeled ${scored.length === 1 ? "line" : "lines"} (not buy suggestions) — tap to expand`
              : "Tap header to expand"}
          </p>
        )}

        {sectionExpanded && (
          <>
            <p className="mb-4 text-[10px] leading-relaxed text-stitch-muted">
              0–100 scores compare each holding’s <strong className="font-medium text-stitch-muted">modeled</strong> ladder
              step (improvement per dollar spent) to the strongest in this list only. Same ladder rules as your budget-step
              simulator — not a recommendation to trade, and not the Insights tab’s fixed-$ test score.
            </p>

            {!hasRanked ? (
              <div className="rounded-2xl border border-dashed border-stitch-border/60 bg-stitch-pill/20 p-6 text-center">
                <p className="text-sm text-stitch-muted">
                  Add prices below average to compare simulated ladder steps across positions.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {top && top.rankScore > 0 && (() => {
                  const h = top.holding;
                  const cp = currencyPrefix((h.exchange ?? "US") as "US" | "TSX");
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => navigate(`/holdings/${h.id}?tab=strategy`)}
                      className="w-full rounded-2xl border border-stitch-border/60 bg-stitch-pill/30 p-4 text-left transition-colors hover:border-stitch-accent/40 hover:bg-stitch-pill/40"
                    >
                      <div className="mb-2 flex items-center gap-1.5">
                        <Gauge className="h-3.5 w-3.5 text-stitch-accent" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-stitch-muted">
                          Top relative score (this list)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[17px] font-bold tracking-tight text-white">{h.ticker}</span>
                          <p className="mt-0.5 font-mono text-xs text-stitch-muted">
                            Simulated {cp}
                            {fmt(top.step.amount)} → avg {cp}
                            {fmt(top.step.newAvg)} (−{cp}
                            {fmt(top.step.avgImprovement)}/share)
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-stitch-muted/70">
                            Avg {cp}
                            {fmt(h.avg_cost)} · Price {cp}
                            {fmt(top.price)}
                          </p>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[28px] font-bold leading-none text-stitch-accent">{top.rankScore}</span>
                          <span className="text-[8px] uppercase tracking-wider text-stitch-muted/60">score</span>
                        </div>
                      </div>
                    </button>
                  );
                })()}

                {rest.length > 0 && (
                  <div className="space-y-0.5">
                    {visibleRest.map(({ holding: h, price, rankScore, step }) => {
                      const cp = currencyPrefix((h.exchange ?? "US") as "US" | "TSX");
                      if (!step) return null;
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => navigate(`/holdings/${h.id}?tab=strategy`)}
                          className="flex w-full items-center gap-3 rounded-xl border border-stitch-border bg-stitch-card px-3 py-2.5 text-left transition-colors hover:bg-stitch-pill/30"
                        >
                          <span className="w-7 shrink-0 text-right text-sm font-bold tabular-nums text-stitch-accent/80">
                            {rankScore}
                          </span>
                          <span className="w-16 shrink-0 text-sm font-semibold text-white">{h.ticker}</span>
                          <span className="flex-1 truncate font-mono text-[11px] text-stitch-muted">
                            {cp}
                            {fmt(step.amount)} sim → −{cp}
                            {fmt(step.avgImprovement)}/share
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-stitch-muted/40" />
                        </button>
                      );
                    })}
                    {rest.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setShowAll((v) => !v)}
                        className="w-full py-1.5 text-center text-[11px] text-stitch-muted/60 transition-colors hover:text-stitch-muted"
                      >
                        {showAll ? "Show less" : `Show all ${rest.length}`}
                      </button>
                    )}
                  </div>
                )}

                <p className="pt-1 text-center text-[9px] text-stitch-muted/50">
                  Illustrative simulations only — not financial advice.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/* ── Most efficient step (portfolio) — same ladder rule ─── */
function MostEfficientStep({
  holdings,
  livePrices,
  navigate,
}: {
  holdings: Holding[];
  livePrices: Record<string, number | null>;
  navigate: (path: string) => void;
}) {
  const { includeFees } = useSimFees();

  const best = useMemo(() => {
    let top: { holding: Holding; price: number; step: DcaRow } | null = null;
    let bestEff = -Infinity;

    for (const h of holdings) {
      const price = livePrices[h.id];
      if (price == null || price <= 0 || price >= h.avg_cost) continue;
      const step = selectMostEfficientLadderStep(
        h.shares,
        h.avg_cost,
        price,
        holdingFeeOpts(h, includeFees)
      );
      if (!step || step.avgImprovement <= 0) continue;
      if (step.improvementPerDollar > bestEff) {
        bestEff = step.improvementPerDollar;
        top = { holding: h, price, step };
      }
    }
    return top;
  }, [holdings, livePrices, includeFees]);

  if (!best) return null;

  const h = best.holding;
  const cp = currencyPrefix((h.exchange ?? "US") as "US" | "TSX");

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-stitch-border bg-stitch-card p-6 shadow-lg">
      <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-stitch-accent/10 blur-3xl" />
      <div className="relative z-10">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 shrink-0 text-stitch-accent" />
          <h2 className="text-[17px] font-semibold text-white">Portfolio ladder highlight</h2>
        </div>
        <p className="mb-3 text-[10px] leading-relaxed text-stitch-muted">
          Which holding’s fixed budget-rung simulation currently shows the highest modeled improvement-per-dollar (same
          rules as the budget-step simulator on each position). For comparison only — not an instruction to trade.
        </p>
        <button
          type="button"
          onClick={() => navigate(`/holdings/${h.id}?tab=strategy`)}
          className="w-full rounded-2xl border border-stitch-border/60 bg-stitch-pill/30 p-4 text-left transition-colors hover:border-stitch-accent/40 hover:bg-stitch-pill/40"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[17px] font-bold tracking-tight text-white">{h.ticker}</span>
              <p className="mt-1 font-mono text-sm text-stitch-muted">
                Simulated deploy {cp}
                {fmt(best.step.amount)} → avg {cp}
                {fmt(best.step.newAvg)}
              </p>
              <p className="mt-0.5 flex items-center gap-1 font-mono text-sm font-medium text-stitch-accent">
                <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />
                Avg moves by {cp}
                {fmt(best.step.avgImprovement)}/share
              </p>
              <p className="mt-1.5 font-mono text-[10px] text-stitch-muted/60">
                Current avg {cp}
                {fmt(h.avg_cost)} · Price {cp}
                {fmt(best.price)}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-stitch-muted/40" />
          </div>
        </button>
      </div>
    </section>
  );
}

