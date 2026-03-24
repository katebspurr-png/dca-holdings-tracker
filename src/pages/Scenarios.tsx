import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getScenarios } from "@/lib/storage";

const METHOD_LABELS: Record<string, string> = {
  price_shares: "Price + Shares",
  price_budget: "Price + Budget",
  price_target: "Price + Target Avg",
  budget_target: "Budget + Target Avg",
};

const outlineBtn =
  "border-stitch-border bg-stitch-pill text-stitch-muted-soft hover:bg-stitch-card hover:text-white";

export default function Scenarios() {
  const navigate = useNavigate();
  const [tickerFilter, setTickerFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  const scenarios = getScenarios();

  const filtered = useMemo(() => {
    return scenarios.filter((s) => {
      if (tickerFilter && !s.ticker.toLowerCase().includes(tickerFilter.toLowerCase())) return false;
      if (methodFilter !== "all" && s.method !== methodFilter) return false;
      return true;
    });
  }, [scenarios, tickerFilter, methodFilter]);

  return (
    <div className="relative min-h-[max(884px,100dvh)] overflow-x-hidden bg-stitch-bg pb-28 font-sans text-white antialiased">
      <header className="mb-6 px-4 pt-10 sm:px-6 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" className={outlineBtn} onClick={() => navigate("/")}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Portfolio
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Saved Scenarios</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 pb-8 sm:px-6 md:px-8">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Filter by ticker…"
            value={tickerFilter}
            onChange={(e) => setTickerFilter(e.target.value)}
            className="w-48 border-stitch-border bg-stitch-pill text-white placeholder:text-stitch-muted/50"
          />
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className={`w-52 ${outlineBtn}`}>
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent className="z-50 border-stitch-border bg-stitch-card text-white">
              <SelectItem value="all">All methods</SelectItem>
              {Object.entries(METHOD_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-stitch-muted">No scenarios found.</p>
        ) : (
          <div className="overflow-hidden rounded-[32px] border border-stitch-border bg-stitch-card shadow-lg">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-stitch-border hover:bg-transparent">
                    <TableHead className="text-stitch-muted">Date</TableHead>
                    <TableHead className="text-stitch-muted">Ticker</TableHead>
                    <TableHead className="text-stitch-muted">Method</TableHead>
                    <TableHead className="text-right text-stitch-muted">Budget</TableHead>
                    <TableHead className="text-right text-stitch-muted">Fee</TableHead>
                    <TableHead className="text-right text-stitch-muted">Total Spend</TableHead>
                    <TableHead className="text-right text-stitch-muted">Shares to Buy</TableHead>
                    <TableHead className="text-right text-stitch-muted">New Avg Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer border-stitch-border hover:bg-stitch-pill/30"
                      onClick={() => navigate(`/scenarios/${s.id}`)}
                    >
                      <TableCell className="whitespace-nowrap text-sm text-stitch-muted">
                        {new Date(s.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-white">{s.ticker}</TableCell>
                      <TableCell className="text-sm text-stitch-muted-soft">
                        {METHOD_LABELS[s.method] ?? s.method}
                      </TableCell>
                      <TableCell className="text-right font-mono">${Number(s.budget_invested).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">${Number(s.fee_applied).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">${Number(s.total_spend).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{Number(s.shares_to_buy).toFixed(4)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-stitch-accent">
                        ${Number(s.new_avg_cost).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
