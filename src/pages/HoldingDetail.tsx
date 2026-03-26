import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Undo2, TrendingDown, TrendingUp, Award, ArrowRight,
  Trash2, Eye, Target as TargetIcon, Calculator, History, AlertCircle, Info,
  Save, Zap, CheckCircle, Minus, Lightbulb, Gauge, Users, Pencil,
} from "lucide-react";
import GoalLadder from "@/components/GoalLadder";
import SuggestedStrategyStep from "@/components/SuggestedStrategyStep";
import HoldingFormDialog from "@/components/HoldingFormDialog";
import CostBasisProgress from "@/components/CostBasisProgress";
import InsightsTab from "@/components/InsightsTab";
import SavedScenarios from "@/components/SavedScenarios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getHolding, getScenariosForHolding, getTransactionsForHolding,
  undoLastBuy, removeScenario, currencyPrefix, exchangeLabel, apiTicker,
  addScenario, applyBuyToHolding, editHolding, type Scenario, type Holding, type Transaction,
} from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { useStorageRevision } from "@/hooks/use-storage-revision";
import { usePreAuthSaveUpsell } from "@/hooks/use-pre-auth-save-upsell";
import { DemoDataTag } from "@/components/DemoDataTag";
import { transactionFromDbRow } from "@/lib/sync";
import { getCachedQuote, fetchStockPrice } from "@/lib/stock-price";
import { canLookup } from "@/lib/pro";
import { canSaveScenario, scenariosRemaining, hasFeature, FREE_SCENARIO_LIMIT } from "@/lib/feature-access";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

type WorkspaceTab = "overview" | "strategy" | "calculator" | "history" | "insights";

const WORKSPACE_TABS: { key: WorkspaceTab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: Eye },
  { key: "strategy", label: "Plan", icon: TargetIcon },
  { key: "calculator", label: "Calculator", icon: Calculator },
  { key: "history", label: "History", icon: History },
  { key: "insights", label: "Math", icon: Lightbulb },
];

const fmt2 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt4 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

function formatHistoryDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toFixed(0);
}

// ── Calculator types & logic ──────────────────────────────────
type Method = "price_shares" | "price_budget" | "price_target" | "budget_target";

const METHOD_OPTIONS: { value: Method; label: string; desc: string }[] = [
  { value: "price_shares", label: "Price + Shares", desc: "Set buy price & share count" },
  { value: "price_budget", label: "Price + Budget", desc: "Set buy price and max budget" },
  { value: "price_target", label: "Price + Scenario avg", desc: "Model a specific average cost" },
  { value: "budget_target", label: "Budget + Scenario avg", desc: "Fixed budget toward a modeled average" },
];

const FIELD_CONFIG: Record<Method, [{ key: string; label: string }, { key: string; label: string }]> = {
  price_shares: [{ key: "buyPrice", label: "Buy price" }, { key: "sharesToBuy", label: "Shares to buy" }],
  price_budget: [{ key: "buyPrice", label: "Buy price" }, { key: "budget", label: "Max budget (excl. fee)" }],
  price_target: [{ key: "buyPrice", label: "Buy price" }, { key: "targetAvg", label: "Scenario average cost" }],
  budget_target: [{ key: "budget", label: "Budget (excl. fee)" }, { key: "targetAvg", label: "Scenario average cost" }],
};

const SLIDER_STEPS = [25, 50, 75, 100];

type ResultOk = {
  ok: true; x: number; budget: number; feeApplied: number; totalSpend: number;
  totalShares: number; newAvg: number; effectivePrice: number | null;
};
type ResultErr = { ok: false; error: string; level: "error" | "info" };
type Result = ResultOk | ResultErr;

function computeFee(feeType: string, feeValue: number, B: number): number {
  if (feeType === "percent") return B * (feeValue / 100);
  return feeValue;
}

function compute(
  method: Method, S: number, A: number,
  feeType: string, feeValue: number, includeFees: boolean,
  i1: number, i2: number
): Result {
  switch (method) {
    case "price_shares": {
      const p = i1, x = i2;
      if (p <= 0 || x <= 0) return { ok: false, error: "Values must be positive", level: "error" };
      const B = x * p;
      const f = includeFees ? computeFee(feeType, feeValue, B) : 0;
      const newAvg = (S * A + B + f) / (S + x);
      return { ok: true, x, budget: B, feeApplied: f, totalSpend: B + f, totalShares: S + x, newAvg, effectivePrice: null };
    }
    case "price_budget": {
      const p = i1, B = i2;
      if (p <= 0 || B <= 0) return { ok: false, error: "Values must be positive", level: "error" };
      const x = B / p;
      const f = includeFees ? computeFee(feeType, feeValue, B) : 0;
      const newAvg = (S * A + B + f) / (S + x);
      return { ok: true, x, budget: B, feeApplied: f, totalSpend: B + f, totalShares: S + x, newAvg, effectivePrice: null };
    }
    case "price_target": {
      const p = i1, t = i2;
      if (p <= 0 || t <= 0) return { ok: false, error: "Values must be positive", level: "error" };
      if (t >= A) return { ok: false, error: "Scenario average is already at/above current average", level: "info" };
      if (p >= t) return { ok: false, error: "Buy price must be below the scenario average for this model", level: "error" };
      if (feeType === "percent" && includeFees) {
        const r = feeValue / 100;
        const numB = S * (t - A);
        const denB = 1 + r - t / p;
        if (denB === 0) return { ok: false, error: "Invalid inputs", level: "error" };
        const B = numB / denB;
        if (B <= 0) return { ok: false, error: "Invalid inputs", level: "error" };
        const x = B / p;
        const f = computeFee(feeType, feeValue, B);
        const newAvg = (S * A + B + f) / (S + x);
        return { ok: true, x, budget: B, feeApplied: f, totalSpend: B + f, totalShares: S + x, newAvg, effectivePrice: null };
      } else {
        const f = includeFees ? computeFee(feeType, feeValue, 0) : 0;
        const den = t - p;
        if (den <= 0) return { ok: false, error: "Invalid inputs", level: "error" };
        const x = (S * (A - t) + f) / den;
        if (x <= 0) return { ok: false, error: "Invalid inputs", level: "error" };
        const B = x * p;
        const newAvg = (S * A + B + f) / (S + x);
        return { ok: true, x, budget: B, feeApplied: f, totalSpend: B + f, totalShares: S + x, newAvg, effectivePrice: null };
      }
    }
    case "budget_target": {
      const B = i1, t = i2;
      if (B <= 0 || t <= 0) return { ok: false, error: "Values must be positive", level: "error" };
      if (t >= A) return { ok: false, error: "Scenario average is already at/above current average", level: "info" };
      const f = includeFees ? computeFee(feeType, feeValue, B) : 0;
      const den = S * (A - t) + B + f;
      if (den <= 0) return { ok: false, error: "Invalid inputs", level: "error" };
      const p = (t * B) / den;
      if (p <= 0) return { ok: false, error: "Invalid inputs", level: "error" };
      const x = B / p;
      const newAvg = (S * A + B + f) / (S + x);
      return { ok: true, x, budget: B, feeApplied: f, totalSpend: B + f, totalShares: S + x, newAvg, effectivePrice: p };
    }
  }
}

function getPresets(method: Method, field: 1 | 2): { label: string; value: string }[] {
  if (method === "price_shares" && field === 2)
    return [{ label: "+10", value: "10" }, { label: "+25", value: "25" }, { label: "+50", value: "50" }, { label: "+100", value: "100" }];
  if ((method === "price_budget" || method === "budget_target") && field === (method === "price_budget" ? 2 : 1))
    return [{ label: "$250", value: "250" }, { label: "$500", value: "500" }, { label: "$1,000", value: "1000" }, { label: "$2,500", value: "2500" }];
  return [];
}

const METHOD_LABELS: Record<string, string> = {
  price_shares: "Price + Shares",
  price_budget: "Price + Budget",
  price_target: "Price + Scenario avg",
  budget_target: "Budget + Scenario avg",
};

// ── Main Component ──────────────────────────────────────────
export default function HoldingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const storageRevision = useStorageRevision();
  const { toast } = useToast();
  const { requestPersist, preAuthUpsellDialog } = usePreAuthSaveUpsell();
  const [version, setVersion] = useState(0);
  const [undoing, setUndoing] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Active tab
  const tabParam = searchParams.get("tab") as WorkspaceTab | null;
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(
    tabParam && ["overview", "strategy", "calculator", "history", "insights"].includes(tabParam) ? tabParam : "strategy"
  );

  const switchTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tab);
    setSearchParams(newParams, { replace: true });
  };

  // ── Calculator state ────────────────────────────────────────
  const [calcMethod, setCalcMethod] = useState<Method>(() => {
    const m = searchParams.get("method");
    return (m && ["price_shares", "price_budget", "price_target", "budget_target"].includes(m))
      ? m as Method : "price_shares";
  });
  const [val1, setVal1] = useState(() => searchParams.get("val1") || "");
  const [val2, setVal2] = useState(() => searchParams.get("val2") || "");
  const [includeFees, setIncludeFees] = useState(true);
  const [budgetPercent, setBudgetPercent] = useState(100);
  const [calcTick, setCalcTick] = useState(0);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [scenarioToApply, setScenarioToApply] = useState<Scenario | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const holding = useMemo(() => (id ? getHolding(id) : undefined), [id, version, storageRevision]);
  const scenarios = id ? getScenariosForHolding(id) : [];
  const localTransactions = useMemo(
    () => (id ? getTransactionsForHolding(id) : []),
    [id, version, storageRevision],
  );
  void calcTick;

  const {
    data: cloudTransactions,
    isPending: historyLoading,
    isError: historyError,
  } = useQuery({
    queryKey: ["holding-transactions", id, user?.id],
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await (supabase as any)
        .from("transactions")
        .select("*")
        .eq("holding_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => transactionFromDbRow(row as Record<string, unknown>));
    },
    enabled: Boolean(user?.id && id && activeTab === "history" && !isDemoMode),
  });

  const historyRows: Transaction[] = useMemo(() => {
    if (!user || isDemoMode || cloudTransactions === undefined || historyError) return localTransactions;
    const byId = new Map<string, Transaction>();
    for (const t of cloudTransactions) byId.set(t.id, t);
    for (const t of localTransactions) {
      if (!byId.has(t.id)) byId.set(t.id, t);
    }
    return [...byId.values()].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [user, isDemoMode, cloudTransactions, historyError, localTransactions]);

  const latestTx = localTransactions[0];
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

  // ── Calculator computed result ──────────────────────────────
  const input1IsPrice = calcMethod !== "budget_target";
  const fields = FIELD_CONFIG[calcMethod];

  const effectiveVal2 = useMemo(() => {
    if (calcMethod === "price_budget" && val2 !== "") {
      const maxB = parseFloat(val2);
      if (!isNaN(maxB)) return String(maxB * (budgetPercent / 100));
    }
    return val2;
  }, [calcMethod, val2, budgetPercent]);

  const calcResult = useMemo(() => {
    if (!holding) return null;
    const n1 = parseFloat(val1);
    const n2 = parseFloat(calcMethod === "price_budget" ? effectiveVal2 : val2);
    if (isNaN(n1) || isNaN(n2)) return null;
    return compute(calcMethod, S, A, holding.fee_type, Number(holding.fee_value), includeFees, n1, n2);
  }, [calcMethod, val1, val2, effectiveVal2, holding, includeFees, S, A]);

  const r = calcResult !== null && calcResult.ok === true ? (calcResult as ResultOk) : null;
  const isValid = r !== null;
  const isError = calcResult !== null && !calcResult.ok;
  const hasInputs = val1 !== "" && val2 !== "";
  const isPriceBudget = calcMethod === "price_budget";
  const avgDiff = r ? A - r.newAvg : 0;
  const avgImproves = avgDiff > 0.005;
  const avgWorsens = avgDiff < -0.005;

  // ── Undo ────────────────────────────────────────────────────
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

  // ── Calculator actions ──────────────────────────────────────
  const handleUseCurrentPrice = async () => {
    if (!holding) return;
    setFetchingPrice(true);
    const result = await fetchStockPrice(apiTicker(holding.ticker, exchange), {
      bypassCache: true,
    });
    setFetchingPrice(false);
    if (result.ok) {
      setVal1(String(result.quote.price));
    } else {
      toast({ title: "Price unavailable", description: "Could not fetch price", variant: "destructive" });
    }
  };

  const handleMethodChange = (v: Method) => {
    setCalcMethod(v);
    setVal1("");
    setVal2("");
    setBudgetPercent(100);
  };

  const handleUseAsTarget = () => {
    if (!r) return;
    const currentPrice = val1;
    setCalcMethod("price_target");
    setVal1(currentPrice);
    setVal2(String(r.newAvg));
    setBudgetPercent(100);
  };

  const getBuyPrice = (): number => {
    if (!r) return 0;
    const n1 = parseFloat(val1);
    if (calcMethod === "budget_target" && r.effectivePrice !== null) return r.effectivePrice;
    return n1;
  };

  const handleSave = () => {
    if (!holding || !r) return;
    const currentCount = scenarios.length;
    if (!canSaveScenario(currentCount)) {
      toast({
        title: "Scenario limit reached",
        description: `Free tier allows up to ${FREE_SCENARIO_LIMIT} scenarios per holding. Enable premium preview in Settings for unlimited.`,
        variant: "destructive",
      });
      return;
    }
    const flds = FIELD_CONFIG[calcMethod];
    const n1 = parseFloat(val1), n2 = parseFloat(val2);
    let buyPrice: number | null = null;
    if (calcMethod !== "budget_target") buyPrice = n1;
    else if (r.effectivePrice !== null) buyPrice = r.effectivePrice;

    requestPersist(() => {
      addScenario({
        holding_id: holding.id, ticker: holding.ticker, method: calcMethod,
        input1_label: flds[0].label, input1_value: n1,
        input2_label: flds[1].label, input2_value: n2,
        include_fees: includeFees, fee_amount: r.feeApplied,
        buy_price: buyPrice, shares_to_buy: r.x,
        budget_invested: r.budget, fee_applied: r.feeApplied,
        total_spend: r.totalSpend, new_total_shares: r.totalShares,
        new_avg_cost: r.newAvg,
        recommended_target: isPriceBudget ? r.newAvg : null,
        budget_percent_used: isPriceBudget ? budgetPercent : null,
        notes: null,
      });
      toast({ title: "Scenario saved" });
      setVal1(""); setVal2(""); setBudgetPercent(100);
      setCalcTick((t) => t + 1);
      setVersion((v) => v + 1);
    });
  };

  const handleApplyBuy = () => {
    if (!holding || !r || applying) return;
    setShowApplyConfirm(true);
  };

  const confirmApplyBuy = () => {
    if (!holding || !r || applying) return;
    setShowApplyConfirm(false);
    requestPersist(() => {
      setApplying(true);
      try {
        applyBuyToHolding({
          holdingId: holding.id, buyPrice: getBuyPrice(), sharesBought: r.x,
          budgetInvested: r.budget, feeApplied: r.feeApplied, totalSpend: r.totalSpend,
          includeFees, newTotalShares: r.totalShares, newAvgCost: r.newAvg, method: calcMethod,
        });
        toast({ title: "Buy applied successfully" });
        setVal1(""); setVal2(""); setBudgetPercent(100);
        setVersion((v) => v + 1);
        setCalcTick((t) => t + 1);
      } catch (e: any) {
        toast({ title: "Failed to apply buy", description: e?.message ?? "Unknown error", variant: "destructive" });
      } finally {
        setApplying(false);
      }
    });
  };

  const handleApplyScenario = (s: Scenario) => {
    if (!holding || applying) return;
    setScenarioToApply(s);
  };

  const confirmApplyScenario = () => {
    if (!holding || !scenarioToApply || applying) return;
    const s = scenarioToApply;
    setScenarioToApply(null);
    requestPersist(() => {
      setApplying(true);
      try {
        applyBuyToHolding({
          holdingId: holding.id, buyPrice: s.buy_price ?? s.input1_value,
          sharesBought: s.shares_to_buy, budgetInvested: s.budget_invested,
          feeApplied: s.fee_applied, totalSpend: s.total_spend,
          includeFees: s.include_fees, newTotalShares: s.new_total_shares,
          newAvgCost: s.new_avg_cost, method: s.method,
        });
        toast({ title: "Buy applied successfully" });
        setVersion((v) => v + 1);
        setCalcTick((t) => t + 1);
      } catch (e: any) {
        toast({ title: "Failed to apply buy", description: e?.message ?? "Unknown error", variant: "destructive" });
      } finally {
        setApplying(false);
      }
    });
  };

  // ── Navigate to calculator tab with prefill ─────────────────
  const openCalculatorPrefilled = useCallback((method: string, v1: string, v2: string) => {
    setCalcMethod(method as Method);
    setVal1(v1);
    setVal2(v2);
    setBudgetPercent(100);
    switchTab("calculator");
  }, []);

  if (!holding) {
    return (
      <div className="relative flex min-h-[max(884px,100dvh)] items-center justify-center bg-stitch-bg px-4 text-foreground">
        <p className="text-stitch-muted">Holding not found.</p>
      </div>
    );
  }

  const feeLabel = holding.fee_type === "percent"
    ? `${Number(holding.fee_value).toFixed(2)}%`
    : `${cp}${Number(holding.fee_value ?? holding.fee).toFixed(2)}`;
  const presets1 = getPresets(calcMethod, 1);
  const presets2 = getPresets(calcMethod, 2);

  // Goal Ladder helpers
  const shares = Number(holding.shares);
  const avgCost = Number(holding.avg_cost);
  const currentPrice = Number(holding.current_price ?? marketPrice ?? 0);
  const isUnderwater = currentPrice > 0 && currentPrice < avgCost;

  function calcNewAvg(investAmount: number): { newAvg: number; improvement: number } {
    if (currentPrice <= 0) return { newAvg: avgCost, improvement: 0 };
    const sharesBought = investAmount / currentPrice;
    const newAvg = (shares * avgCost + investAmount) / (shares + sharesBought);
    const improvement = avgCost - newAvg;
    return { newAvg, improvement };
  }

  const ladderAmounts = [250, 500, 1000, 2500, 5000];

  return (
    <>
    <div className="relative min-h-[max(884px,100dvh)] overflow-x-hidden bg-stitch-bg pb-28 font-sans text-foreground antialiased">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-stitch-border bg-stitch-bg/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 sm:px-6 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-stitch-muted hover:bg-stitch-pill/40 hover:text-foreground"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h1 className="text-lg font-bold tracking-tight truncate">
              <span className="text-stitch-accent font-mono">{holding.ticker}</span>
              <span className="text-stitch-muted font-normal ml-1.5 text-sm">Position</span>
            </h1>
            <Badge variant="outline" className="h-5 shrink-0 border-stitch-border px-1.5 text-[10px] text-stitch-muted-soft">
              {exchangeLabel(exchange)}
            </Badge>
            {isDemoMode && <DemoDataTag />}
          </div>
          {canUndo && (
            <Button
              variant="ghost" size="sm" className="h-8 text-[10px] px-2 text-stitch-muted hover:text-destructive"
              disabled={undoing} onClick={() => setShowUndoConfirm(true)}
            >
              <Undo2 className="mr-1 h-3 w-3" /> Undo
            </Button>
          )}
        </div>
        {/* Tab bar */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex gap-0 -mb-px overflow-x-auto">
            {WORKSPACE_TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === key
                    ? "border-stitch-accent text-stitch-accent"
                    : "border-transparent text-stitch-muted hover:text-foreground hover:border-stitch-border"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-5">
        {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
        {activeTab === "overview" && (
          <>
            <div className="card-primary">
              <div className="card-primary-glow" aria-hidden />
              <div className="relative z-10 p-5 sm:p-6 space-y-6">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stitch-muted">Position snapshot</h2>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 text-stitch-muted hover:text-foreground" onClick={() => setEditOpen(true)}>
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Button>
                </div>

                {/* Emphasized: avg, market, P&L */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="card-secondary px-4 py-4">
                    <p className="text-[10px] uppercase tracking-wider text-stitch-muted mb-1.5">Avg cost</p>
                    <p className="text-xl font-mono font-semibold tabular-nums text-stitch-accent leading-none">{cp}{fmt2(A)}</p>
                  </div>
                  <div className="card-secondary px-4 py-4">
                    <p className="text-[10px] uppercase tracking-wider text-stitch-muted mb-1.5">Market price</p>
                    <p className="text-xl font-mono font-semibold tabular-nums text-foreground leading-none">
                      {marketPrice != null ? `${cp}${fmt2(marketPrice)}` : "—"}
                    </p>
                  </div>
                  <div className="card-secondary px-4 py-4">
                    <p className="text-[10px] uppercase tracking-wider text-stitch-muted mb-1.5">Unrealized P/L</p>
                    {unrealizedPL != null ? (
                      <>
                        <p className={`text-xl font-mono font-semibold tabular-nums leading-none ${unrealizedPL >= 0 ? "text-stitch-accent" : "text-destructive"}`}>
                          {unrealizedPL >= 0 ? "+" : ""}{cp}{fmt2(unrealizedPL)}
                        </p>
                        {unrealizedPct != null && (
                          <p className={`text-[11px] font-mono mt-1 ${unrealizedPL >= 0 ? "text-stitch-accent/80" : "text-destructive/80"}`}>
                            {unrealizedPct >= 0 ? "+" : ""}{unrealizedPct.toFixed(1)}%
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xl font-mono font-semibold text-stitch-muted leading-none">—</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 pt-1 border-t border-stitch-border/25">
                  <MiniStat label="Shares" value={fmt4(S)} />
                  <MiniStat label="Cost basis" value={`${cp}${fmt2(costBasis)}`} />
                  {marketValue != null && <MiniStat label="Market value" value={`${cp}${fmt2(marketValue)}`} />}
                </div>

                {quote && quote.todayOpen != null ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stitch-muted font-mono pt-2 border-t border-stitch-border/25">
                    <span>Open {cp}{quote.todayOpen.toFixed(2)}</span>
                    {quote.todayLow != null && <span>Low {cp}{quote.todayLow.toFixed(2)}</span>}
                    {quote.todayHigh != null && <span>High {cp}{quote.todayHigh.toFixed(2)}</span>}
                    {quote.todayVolume != null && <span>Vol {formatVolume(quote.todayVolume)}</span>}
                    <span>Fee: {feeLabel}</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stitch-muted font-mono pt-2 border-t border-stitch-border/25">
                    <span>Fee: {feeLabel} ({holding.fee_type})</span>
                  </div>
                )}
              </div>
            </div>

            <CostBasisProgress holding={holding} currencyPrefix={cp} />
          </>
        )}

        {/* ═══════════════ PLAN TAB ═══════════════ */}
        {activeTab === "strategy" && (
          <>
            <SuggestedStrategyStep
              mode="holding"
              holding={holding}
              currentPrice={marketPrice}
              onUseInCalculator={openCalculatorPrefilled}
              onSaved={() => setVersion((v) => v + 1)}
            />

            {/* Unified modeling card: example → buy impact → modeled rungs */}
            <div className="card-primary">
              <div className="card-primary-glow" aria-hidden />
              <div className="relative z-10 divide-y divide-stitch-border/25">
                {isUnderwater && (
                  <section className="p-5 sm:p-6">
                    <h2 className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-stitch-accent">
                      <Zap className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
                      Example scenario
                    </h2>
                    {(() => {
                      const { newAvg, improvement } = calcNewAvg(500);
                      return (
                        <div className="card-secondary bg-stitch-pill/15 px-4 py-4 sm:px-5 sm:py-5">
                          <p className="mb-3 text-sm text-stitch-muted">
                            Invest {cp}500 →
                          </p>
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                            <div className="min-w-0 sm:flex-1">
                              <p className="text-[10px] font-medium uppercase tracking-wider text-stitch-muted">Current avg</p>
                              <p className="mt-0.5 text-lg font-mono font-semibold tabular-nums text-foreground">
                                {cp}{avgCost.toFixed(2)}
                              </p>
                            </div>
                            <ArrowRight className="mx-auto h-7 w-7 shrink-0 text-primary sm:mx-0" strokeWidth={2} aria-hidden />
                            <div className="min-w-0 text-left sm:flex-1 sm:text-right">
                              <p className="text-[10px] font-medium uppercase tracking-wider text-stitch-muted">Modeled avg</p>
                              <p className="mt-0.5 text-lg font-mono font-semibold tabular-nums text-primary">
                                {cp}{newAvg.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <p className="mt-4 text-xs leading-relaxed text-stitch-muted">
                            Average cost change:{" "}
                            <span className="font-mono font-semibold text-primary">{cp}{improvement.toFixed(2)}</span>
                            {" "}/ share (modeled)
                          </p>
                        </div>
                      );
                    })()}
                  </section>
                )}

                {isUnderwater && (
                  <section className="p-5 sm:p-6">
                    <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-stitch-muted">
                      Buy impact (sample amounts)
                    </h2>
                    <div className="card-secondary overflow-hidden bg-stitch-pill/15">
                      <ul className="divide-y divide-stitch-border/20">
                        {ladderAmounts.map((amt) => {
                          const { newAvg, improvement } = calcNewAvg(amt);
                          return (
                            <li
                              key={amt}
                              className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                            >
                              <span className="text-sm font-mono text-stitch-muted">
                                Invest {cp}{amt.toLocaleString()}
                              </span>
                              <div className="flex flex-wrap items-end justify-between gap-4 sm:justify-end sm:text-right">
                                <div>
                                  <p className="text-[10px] font-medium uppercase tracking-wider text-stitch-muted">Modeled avg</p>
                                  <p className="mt-0.5 text-sm font-mono font-semibold tabular-nums text-foreground">
                                    {cp}{newAvg.toFixed(2)}
                                  </p>
                                </div>
                                <div className="min-w-[7rem] sm:min-w-[6.5rem]">
                                  <p className="text-[10px] font-medium uppercase tracking-wider text-stitch-muted">Avg Δ / share</p>
                                  <p className="mt-0.5 text-sm font-mono font-semibold tabular-nums text-primary">
                                    ↓{cp}{improvement.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </section>
                )}

                <GoalLadder holding={holding} />
              </div>
            </div>

            {/* Saved scenarios */}
            <div className="space-y-3">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stitch-muted">Saved Scenarios</h2>
                  <p className="text-[11px] text-stitch-muted/70 mt-0.5">Previously saved calculator scenarios for {holding.ticker}.</p>
                </div>
                {scenarios.length > 0 && (
                  <span className="text-[10px] text-stitch-muted/50 tabular-nums">{scenarios.length} total</span>
                )}
              </div>

              <SavedScenarios
                holdingId={holding.id}
                exchange={exchange as any}
                refreshKey={version}
                currentAvg={A}
                currencyPrefix={cp}
                onUseScenario={(s: Scenario) => openCalculatorPrefilled(s.method, String(s.input1_value), String(s.input2_value))}
                onApplyBuy={handleApplyScenario}
              />
            </div>
          </>
        )}

        {/* ═══════════════ CALCULATOR TAB ═══════════════ */}
        {activeTab === "calculator" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Left: Inputs */}
              <div className="lg:col-span-3 space-y-4">
                <div className="card-secondary p-4 sm:p-5 space-y-5">
                  <div className="relative z-10 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-widest text-stitch-muted font-semibold">Method</Label>
                    <Select value={calcMethod} onValueChange={handleMethodChange}>
                      <SelectTrigger className="w-full h-10 rounded-xl border-stitch-border/50 bg-stitch-pill/60 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 border-stitch-border bg-stitch-card text-foreground">
                        {METHOD_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            <span className="font-medium">{o.label}</span>
                            <span className="text-stitch-muted ml-1.5 text-xs hidden sm:inline">— {o.desc}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Input fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="input1" className="text-xs text-stitch-muted">{fields[0].label}</Label>
                        {input1IsPrice && (
                          <button type="button" className="text-[11px] text-stitch-accent hover:text-stitch-accent/80 font-medium flex items-center gap-1 transition-colors disabled:opacity-40"
                            disabled={fetchingPrice || !canLookup()} onClick={handleUseCurrentPrice}>
                            <Zap className={`h-3 w-3 ${fetchingPrice ? "animate-pulse" : ""}`} /> Live price
                          </button>
                        )}
                      </div>
                      <Input id="input1" type="number" step="any" placeholder="0.00" value={val1}
                        onChange={(e) => setVal1(e.target.value)} className="h-10 rounded-xl border-stitch-border/45 bg-stitch-pill/50 px-3 font-mono text-sm" />
                      {presets1.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {presets1.map((p) => (
                            <button key={p.value} type="button" className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-stitch-border bg-stitch-pill/50 hover:bg-stitch-pill/70 text-stitch-muted hover:text-foreground transition-colors"
                              onClick={() => setVal1(p.value)}>{p.label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="input2" className="text-xs text-stitch-muted">{fields[1].label}</Label>
                      <Input id="input2" type="number" step="any" placeholder="0.00" value={val2}
                        onChange={(e) => setVal2(e.target.value)} className="h-10 rounded-xl border-stitch-border/45 bg-stitch-pill/50 px-3 font-mono text-sm" />
                      {presets2.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {presets2.map((p) => (
                            <button key={p.value} type="button" className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-stitch-border bg-stitch-pill/50 hover:bg-stitch-pill/70 text-stitch-muted hover:text-foreground transition-colors"
                              onClick={() => setVal2(p.value)}>{p.label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {isPriceBudget && (
                    <div className="space-y-2 pt-1">
                      <Label className="text-xs text-stitch-muted">Budget allocation: <span className="text-foreground font-semibold">{budgetPercent}%</span></Label>
                      <Slider min={25} max={100} step={25} value={[budgetPercent]} onValueChange={(v) => setBudgetPercent(v[0])} />
                      <div className="flex justify-between text-[10px] text-stitch-muted">
                        {SLIDER_STEPS.map((s) => (
                          <span key={s} className={budgetPercent === s ? "text-stitch-accent font-bold" : ""}>{s}%</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 rounded-xl border border-stitch-border/30 bg-stitch-pill/20 px-3 py-2.5">
                    <Switch id="include-fees" checked={includeFees} onCheckedChange={setIncludeFees} className="scale-90" />
                    <Label htmlFor="include-fees" className="cursor-pointer text-xs text-stitch-muted">Include fees</Label>
                  </div>
                  </div>
                </div>

                {isError && (() => {
                  const err = calcResult as ResultErr;
                  return err.level === "error" ? (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {err.error}
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 text-xs text-stitch-muted px-1">
                      <Info className="h-3.5 w-3.5 shrink-0" /> {err.error}
                    </p>
                  );
                })()}
              </div>

              {/* Right: Results */}
              <div className="lg:col-span-2">
                <div className={`card-primary sticky top-28 transition-all ${isValid ? "opacity-100" : "opacity-90"}`}>
                  <div className="card-primary-glow opacity-70" aria-hidden />
                  <div className={`relative z-10 p-4 sm:p-5 ${!isValid ? "min-h-[14rem]" : ""}`}>
                    <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stitch-muted mb-4">
                      {isValid ? "Modeled outcome" : "Results"}
                    </h2>
                    {isValid && r ? (
                      <div className="space-y-4">
                        <div className="text-center pb-3 border-b border-stitch-border">
                          <p className="text-[10px] uppercase tracking-widest text-stitch-muted mb-1">
                            Resulting average
                          </p>
                          <p className="text-3xl font-mono font-bold text-stitch-accent leading-none">{cp}{fmt2(r.newAvg)}</p>
                          <div className="flex items-center justify-center gap-1.5 mt-2">
                            <span className="text-[11px] text-stitch-muted font-mono">Current {cp}{fmt2(A)}</span>
                            <span className="text-[11px] mx-0.5">→</span>
                            {avgImproves ? (
                              <span className="text-[11px] font-medium text-stitch-accent flex items-center gap-0.5">
                                <TrendingDown className="h-3 w-3" /> −{cp}{fmt2(Math.abs(avgDiff))}/share
                              </span>
                            ) : avgWorsens ? (
                              <span className="text-[11px] font-medium text-destructive flex items-center gap-0.5">
                                <TrendingUp className="h-3 w-3" /> +{cp}{fmt2(Math.abs(avgDiff))}/share
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-stitch-muted flex items-center gap-0.5">
                                <Minus className="h-3 w-3" /> No change
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                          <ResultRow label="Shares to buy" value={fmt4(r.x)} />
                          <ResultRow label="Budget invested" value={`${cp}${fmt2(r.budget)}`} />
                          <ResultRow label="Fee applied" value={`${cp}${fmt2(r.feeApplied)}`} />
                          <ResultRow label="Total spend" value={`${cp}${fmt2(r.totalSpend)}`} />
                          <ResultRow label="New total shares" value={fmt4(r.totalShares)} />
                          {r.effectivePrice !== null && <ResultRow label="Eff. buy price" value={`${cp}${fmt2(r.effectivePrice)}`} />}
                        </div>
                        <div className="flex flex-col gap-2 pt-2 border-t border-stitch-border">
                          {isPriceBudget && (
                            <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={handleUseAsTarget}>
                              <TargetIcon className="mr-1.5 h-3.5 w-3.5" /> Use in calculator
                            </Button>
                          )}
                          <div className="flex gap-2">
                            <Button onClick={handleSave} size="sm" variant="outline" className="flex-1 h-8 text-xs"
                              disabled={!canSaveScenario(scenarios.length)}>
                              <Save className="mr-1.5 h-3.5 w-3.5" /> Save
                            </Button>
                            <Button onClick={handleApplyBuy} size="sm" disabled={applying} className="flex-1 h-8 text-xs">
                              <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> {applying ? "Applying…" : "Apply Buy"}
                            </Button>
                          </div>
                          {!canSaveScenario(scenarios.length) && (
                            <p className="text-[10px] text-destructive text-center">
                              Limit reached ({FREE_SCENARIO_LIMIT}/{FREE_SCENARIO_LIMIT}). Premium preview in Settings unlocks unlimited.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 py-2">
                        <p className="text-xs text-stitch-muted text-center">
                          {hasInputs ? "Adjust inputs to see results." : "Enter values to see modeled outcome."}
                        </p>
                        <div className="card-secondary border-dashed border-stitch-border/35 bg-stitch-pill/15 px-4 py-5 space-y-3">
                          <div className="h-8 w-24 mx-auto rounded-md bg-stitch-pill/40 animate-pulse" />
                          <div className="space-y-2">
                            <div className="h-3 rounded bg-stitch-pill/30 w-full" />
                            <div className="h-3 rounded bg-stitch-pill/25 w-4/5 mx-auto" />
                            <div className="h-3 rounded bg-stitch-pill/20 w-3/5 mx-auto" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky bottom bar on valid result - mobile */}
            {isValid && r && (
              <div className="fixed bottom-14 left-0 right-0 z-20 border-t border-stitch-border bg-stitch-card/95 backdrop-blur-sm lg:hidden"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
                <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-2.5 gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0">
                      <p className="text-[10px] text-stitch-muted uppercase tracking-wider">Resulting avg</p>
                      <p className="text-sm font-mono font-bold text-stitch-accent">{cp}{fmt2(r.newAvg)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-stitch-muted uppercase tracking-wider">Spend</p>
                      <p className="text-sm font-mono font-semibold">{cp}{fmt2(r.totalSpend)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button onClick={handleSave} size="sm" variant="outline" className="h-7 text-[11px] px-2.5">
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button onClick={handleApplyBuy} size="sm" disabled={applying} className="h-7 text-[11px] px-2.5">
                      <CheckCircle className="h-3 w-3 mr-1" /> Apply
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════ HISTORY TAB ═══════════════ */}
        {activeTab === "history" && (
          <div className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stitch-muted">History</h2>
            {user && historyLoading && (
              <p className="text-[10px] text-stitch-muted font-mono">Loading cloud history…</p>
            )}
            {user && historyError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive font-mono">
                Could not load history.
                {localTransactions.length > 0 ? (
                  <span className="block text-stitch-muted font-normal mt-1">
                    Showing on-device history below.
                  </span>
                ) : null}
              </div>
            )}
            {historyRows.length === 0 && !(user && historyLoading) ? (
              <div className="rounded-xl border border-dashed border-stitch-border bg-stitch-pill/10 p-6 text-center space-y-1 font-mono text-[11px] text-stitch-muted">
                <History className="h-4 w-4 mx-auto text-stitch-muted/50 mb-1" />
                <p>No history yet. Executed buys will appear here.</p>
              </div>
            ) : (
              <div className="space-y-1.5 font-mono text-[11px] leading-snug">
                {historyRows.map((t) => {
                  const isUndo = t.is_undone;
                  return (
                    <div
                      key={t.id}
                      className={`rounded-lg border border-stitch-border/80 bg-stitch-card/60 px-3 py-2.5 ${
                        isUndo ? "opacity-55 border-dashed" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-stitch-muted">{formatHistoryDate(t.created_at)}</span>
                        {isUndo ? (
                          <Badge variant="outline" className="text-[8px] px-1 h-4">
                            Undone
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-foreground/90">
                        Bought {t.shares_bought.toFixed(4)} shares at {cp}
                        {Number(t.buy_price).toFixed(2)}
                      </p>
                      <p className="text-stitch-muted">
                        Total: {cp}
                        {fmt2(t.total_spend)}
                      </p>
                      {t.fee_applied > 0 ? (
                        <p className="text-stitch-muted">
                          Fees: {cp}
                          {fmt2(t.fee_applied)}
                        </p>
                      ) : null}
                      {isUndo && t.undone_at ? (
                        <p className="text-[10px] text-stitch-muted/70 mt-1 pt-1 border-t border-stitch-border/40">
                          Undone {formatHistoryDate(t.undone_at)}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ INSIGHTS TAB ═══════════════ */}
        {activeTab === "insights" && (
          <InsightsTab
            holding={holding}
            marketPrice={marketPrice}
            cp={cp}
            onUseInCalculator={openCalculatorPrefilled}
            onSaved={() => setVersion((v) => v + 1)}
          />
        )}
      </main>

      {/* Edit holding dialog */}
      <HoldingFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={holding}
        onSubmit={(data) => {
          editHolding(holding.id, data);
          setEditOpen(false);
          setVersion((v) => v + 1);
          sonnerToast.success("Holding updated");
        }}
      />

      {/* Undo confirmation */}
      <AlertDialog open={showUndoConfirm} onOpenChange={setShowUndoConfirm}>
        <AlertDialogContent className="border-stitch-border bg-stitch-card text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Undo the last applied buy for {holding.ticker}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the previous shares and average cost. The transaction will be marked as undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-stitch-border bg-transparent text-foreground hover:bg-stitch-pill">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmUndo}>Undo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Apply confirmation dialog */}
      <AlertDialog open={showApplyConfirm} onOpenChange={setShowApplyConfirm}>
        <AlertDialogContent className="border-stitch-border bg-stitch-card text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Apply this buy to {holding.ticker}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the holding's shares and average cost. A transaction record will be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-stitch-border bg-transparent text-foreground hover:bg-stitch-pill">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmApplyBuy}>Apply</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scenario apply confirmation */}
      <AlertDialog open={!!scenarioToApply} onOpenChange={(o) => !o && setScenarioToApply(null)}>
        <AlertDialogContent className="border-stitch-border bg-stitch-card text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Apply this scenario to {holding.ticker}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the holding's shares and average cost based on the saved scenario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-stitch-border bg-transparent text-foreground hover:bg-stitch-pill">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmApplyScenario}>Apply</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
    {preAuthUpsellDialog}
    </>
  );
}


function MiniStat({ label, value, accent, sub, positive, negative }: {
  label: string; value: string; accent?: boolean; sub?: string; positive?: boolean; negative?: boolean;
}) {
  return (
    <div className="card-secondary px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-widest text-stitch-muted mb-0.5">{label}</p>
      <p className={`text-sm font-mono font-semibold leading-tight ${
        accent ? "text-stitch-accent" : positive ? "text-stitch-accent" : negative ? "text-destructive" : ""
      }`}>{value}</p>
      {sub && (
        <p className={`text-[10px] font-mono ${positive ? "text-stitch-accent" : negative ? "text-destructive" : "text-stitch-muted"}`}>{sub}</p>
      )}
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[11px] text-stitch-muted">{label}</span>
      <span className="text-xs font-mono font-medium tabular-nums">{value}</span>
    </div>
  );
}
