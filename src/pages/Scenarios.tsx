import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

const METHOD_LABELS: Record<string, string> = {
  price_shares: "Price + Shares",
  price_budget: "Price + Budget",
  price_target: "Price + Target Avg",
  budget_target: "Budget + Target Avg",
};

async function fetchScenarios() {
  const { data, error } = await supabase
    .from("dca_scenarios")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export default function Scenarios() {
  const navigate = useNavigate();
  const [tickerFilter, setTickerFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  const { data: scenarios, isLoading } = useQuery({
    queryKey: ["dca_scenarios"],
    queryFn: fetchScenarios,
  });

  const tickers = useMemo(() => {
    if (!scenarios) return [];
    return [...new Set(scenarios.map((s) => s.ticker))].sort();
  }, [scenarios]);

  const filtered = useMemo(() => {
    if (!scenarios) return [];
    return scenarios.filter((s) => {
      if (tickerFilter && !s.ticker.toLowerCase().includes(tickerFilter.toLowerCase())) return false;
      if (methodFilter !== "all" && s.method !== methodFilter) return false;
      return true;
    });
  }, [scenarios, tickerFilter, methodFilter]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-5">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Holdings
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Saved Scenarios</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Filter by ticker…"
            value={tickerFilter}
            onChange={(e) => setTickerFilter(e.target.value)}
            className="w-48"
          />
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-52 bg-background">
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All methods</SelectItem>
              {Object.entries(METHOD_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm">No scenarios found.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                  <TableHead className="text-right">Shares to Buy</TableHead>
                  <TableHead className="text-right">New Avg Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/scenarios/${s.id}`)}
                  >
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-mono font-semibold">{s.ticker}</TableCell>
                    <TableCell className="text-sm">
                      {METHOD_LABELS[s.method] ?? s.method}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${Number(s.budget_invested).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${Number(s.fee_applied).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${Number(s.total_spend).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(s.shares_to_buy).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-primary font-semibold">
                      ${Number(s.new_avg_cost).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}
