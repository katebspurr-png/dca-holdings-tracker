import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getScenario } from "@/lib/storage";

const METHOD_LABELS: Record<string, string> = {
  price_shares: "Price + Shares",
  price_budget: "Price + Budget (Target)",
  price_target: "Price + Target Avg",
  budget_target: "Budget + Target Avg",
};

export default function ScenarioDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const scenario = id ? getScenario(id) : undefined;

  if (!scenario) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Scenario not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-5">
          <Button variant="ghost" size="sm" onClick={() => navigate("/scenarios")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Scenarios
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            Scenario — <span className="text-primary font-mono">{scenario.ticker}</span>
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Stat label="Date" value={new Date(scenario.created_at).toLocaleString()} />
            <Stat label="Ticker" value={scenario.ticker} />
            <Stat label="Method" value={METHOD_LABELS[scenario.method] ?? scenario.method} />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Holding</p>
              <button
                onClick={() => navigate(`/holdings/${scenario.holding_id}/dca`)}
                className="text-lg font-mono font-semibold text-primary underline underline-offset-2 hover:opacity-80"
              >
                Open holding →
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Inputs</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Stat label={scenario.input1_label} value={`$${Number(scenario.input1_value).toFixed(2)}`} />
            <Stat label={scenario.input2_label} value={formatInputValue(scenario.input2_label, scenario.input2_value)} />
            <Stat label="Include Fees" value={scenario.include_fees ? "Yes" : "No"} />
            <Stat label="Fee Amount" value={`$${Number(scenario.fee_amount).toFixed(2)}`} />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Results</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Stat label="Shares to Buy" value={Number(scenario.shares_to_buy).toFixed(4)} />
            <Stat label="Budget Invested" value={`$${Number(scenario.budget_invested).toFixed(2)}`} />
            <Stat label="Fee Applied" value={`$${Number(scenario.fee_applied).toFixed(2)}`} />
            <Stat label="Total Spend" value={`$${Number(scenario.total_spend).toFixed(2)}`} />
            <Stat label="New Total Shares" value={Number(scenario.new_total_shares).toFixed(4)} />
            <Stat label="New Avg Cost" value={`$${Number(scenario.new_avg_cost).toFixed(2)}`} highlight />
            {scenario.buy_price !== null && <Stat label="Buy Price" value={`$${Number(scenario.buy_price).toFixed(2)}`} />}
            {scenario.recommended_target != null && <Stat label="Projected Target" value={`$${Number(scenario.recommended_target).toFixed(2)}`} highlight />}
            {scenario.budget_percent_used != null && <Stat label="Budget % Used" value={`${scenario.budget_percent_used}%`} />}
          </div>
        </div>

        {scenario.notes && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</h2>
            <p className="text-sm">{scenario.notes}</p>
          </div>
        )}
      </main>
    </div>
  );
}

function formatInputValue(label: string, value: number) {
  const lower = label.toLowerCase();
  if (lower.includes("shares")) return Number(value).toFixed(4);
  return `$${Number(value).toFixed(2)}`;
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-mono font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
