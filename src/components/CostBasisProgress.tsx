import type { Holding } from "@/lib/storage";

interface Props {
  holding: Holding;
  currencyPrefix: string;
}

const fmt2 = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EPS = 1e-6;

export default function CostBasisProgress({ holding, currencyPrefix: cp }: Props) {
  const initial = Number(holding.initial_avg_cost);
  const current = Number(holding.avg_cost);
  const shares = Number(holding.shares);

  if (!Number.isFinite(initial) || !Number.isFinite(current) || initial <= 0) {
    return null;
  }

  const delta = current - initial;
  if (Math.abs(delta) < EPS) {
    return null;
  }

  const improved = delta < 0;
  const reduction = improved ? initial - current : 0;
  const increase = !improved ? current - initial : 0;
  const pctVsInitial = Math.min((Math.abs(delta) / initial) * 100, 999);
  const dollarEffect = Math.abs(delta) * shares;

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Cost Basis Progress
          </h2>
          <p className="text-[9px] text-muted-foreground/70 mt-1">
            Compared to the average when this position was first tracked.
          </p>
        </div>
        <span
          className={`text-xs font-mono font-semibold ${improved ? "text-primary" : "text-muted-foreground"}`}
        >
          {improved ? `−${pctVsInitial.toFixed(1)}% avg` : `+${pctVsInitial.toFixed(1)}% avg`}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Initial Avg</p>
          <p className="text-base font-mono font-bold mt-0.5">{cp}{fmt2(initial)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Avg</p>
          <p
            className={`text-base font-mono font-bold mt-0.5 ${improved ? "text-primary" : "text-foreground"}`}
          >
            {cp}{fmt2(current)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {improved ? "Saved / Share" : "Increase / Share"}
          </p>
          <p
            className={`text-base font-mono font-bold mt-0.5 ${improved ? "text-primary" : "text-muted-foreground"}`}
          >
            {improved ? `${cp}${fmt2(reduction)}` : `${cp}${fmt2(increase)}`}
          </p>
        </div>
      </div>

      {improved ? (
        <>
          <div className="mb-3">
            <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(pctVsInitial, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-muted-foreground">No improvement</span>
              <span className="text-[9px] font-medium text-primary">{pctVsInitial.toFixed(1)}% lower avg</span>
              <span className="text-[9px] text-muted-foreground">Initial avg</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Total vs initial snapshot
            </span>
            <span className="text-sm font-mono font-bold text-primary">
              {cp}{fmt2(dollarEffect)} lower
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your recorded average is above the initial snapshot (for example after buys at higher prices). This is
              informational only — not a gain or loss.
            </p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Avg increase × current shares
            </span>
            <span className="text-sm font-mono font-semibold text-muted-foreground">{cp}{fmt2(dollarEffect)}</span>
          </div>
        </>
      )}
    </div>
  );
}
