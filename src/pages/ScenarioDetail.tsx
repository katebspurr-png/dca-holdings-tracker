import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStorageRevision } from "@/hooks/use-storage-revision";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getScenario } from "@/lib/storage";

const METHOD_LABELS: Record<string, string> = {
  price_shares: "Price + Shares",
  price_budget: "Price + Budget",
  price_target: "Price + Scenario avg",
  budget_target: "Budget + Scenario avg",
};

const outlineBtn =
  "border-stitch-border bg-stitch-pill text-stitch-muted-soft transition-interactive hover:bg-stitch-card hover:text-foreground";

const cardClass = "card-primary rounded-[32px] p-6";
const cardGlow = "card-primary-glow";

export default function ScenarioDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const storageRevision = useStorageRevision();

  const scenario = useMemo(() => (id ? getScenario(id) : undefined), [id, storageRevision]);

  if (!scenario) {
    return (
      <div className="relative flex min-h-[max(884px,100dvh)] items-center justify-center bg-stitch-bg px-4 text-foreground">
        <p className="text-stitch-muted">Scenario not found.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[max(884px,100dvh)] overflow-x-hidden bg-stitch-bg pb-28 font-sans text-foreground antialiased">
      <header className="mb-6 px-4 pt-10 sm:px-6 md:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-3">
          <Button variant="outline" size="sm" className={`w-fit ${outlineBtn}`} onClick={() => navigate("/scenarios")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Scenarios
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            Scenario — <span className="font-mono text-stitch-accent">{scenario.ticker}</span>
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 pb-8 sm:px-6 md:px-8">
        <section className={cardClass}>
          <div className={cardGlow} aria-hidden />
          <div className="relative z-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Date" value={new Date(scenario.created_at).toLocaleString()} />
            <Stat label="Ticker" value={scenario.ticker} />
            <Stat label="Method" value={METHOD_LABELS[scenario.method] ?? scenario.method} />
            <div>
              <p className="text-xs uppercase tracking-wider text-stitch-muted">Holding</p>
              <button
                type="button"
                onClick={() => navigate(`/holdings/${scenario.holding_id}?tab=calculator`)}
                className="text-lg font-mono font-semibold text-stitch-accent underline underline-offset-2 transition-interactive hover:opacity-85"
              >
                Open holding →
              </button>
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <div className={cardGlow} aria-hidden />
          <div className="relative z-10">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-stitch-muted">Inputs</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label={scenario.input1_label} value={`$${Number(scenario.input1_value).toFixed(2)}`} />
              <Stat label={scenario.input2_label} value={formatInputValue(scenario.input2_label, scenario.input2_value)} />
              <Stat label="Include Fees" value={scenario.include_fees ? "Yes" : "No"} />
              <Stat label="Fee Amount" value={`$${Number(scenario.fee_amount).toFixed(2)}`} />
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <div className={cardGlow} aria-hidden />
          <div className="relative z-10">
            <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-stitch-muted">Results</h2>
            <p className="mb-4 text-[10px] leading-relaxed text-stitch-muted/85">
              From this saved scenario — illustrative, not live portfolio data.
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label="Modeled shares (buy)" value={Number(scenario.shares_to_buy).toFixed(4)} />
              <Stat label="Amount invested" value={`$${Number(scenario.budget_invested).toFixed(2)}`} />
              <Stat label="Fee applied" value={`$${Number(scenario.fee_applied).toFixed(2)}`} />
              <Stat label="Total spend" value={`$${Number(scenario.total_spend).toFixed(2)}`} />
              <Stat label="Modeled total shares" value={Number(scenario.new_total_shares).toFixed(4)} />
              <Stat label="Modeled average cost" value={`$${Number(scenario.new_avg_cost).toFixed(2)}`} highlight />
              {scenario.buy_price !== null && (
                <Stat label="Buy price (inputs)" value={`$${Number(scenario.buy_price).toFixed(2)}`} />
              )}
              {scenario.recommended_target != null && (
                <Stat label="Scenario average (saved)" value={`$${Number(scenario.recommended_target).toFixed(2)}`} highlight />
              )}
              {scenario.budget_percent_used != null && (
                <Stat label="Budget % used" value={`${scenario.budget_percent_used}%`} />
              )}
            </div>
          </div>
        </section>

        {scenario.notes && (
          <section className={cardClass}>
            <div className={cardGlow} aria-hidden />
            <div className="relative z-10">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stitch-muted">Notes</h2>
              <p className="text-sm text-stitch-muted-soft">{scenario.notes}</p>
            </div>
          </section>
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
      <p className="text-xs uppercase tracking-wider text-stitch-muted">{label}</p>
      <p className={`font-mono text-lg font-semibold ${highlight ? "text-stitch-accent" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
