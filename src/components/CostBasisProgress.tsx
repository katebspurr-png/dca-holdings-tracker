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
    <div className="rounded-2xl border border-stitch-border bg-stitch-card p-4 sm:p-5 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stitch-muted">Cost Basis Progress</h2>
          <p className="mt-1 text-[9px] text-stitch-muted/80">
            Compared to the average when this position was first tracked.
          </p>
        </div>
        <span className={`font-mono text-xs font-semibold ${improved ? "text-stitch-accent" : "text-stitch-muted"}`}>
          {improved ? `−${pctVsInitial.toFixed(1)}% avg` : `+${pctVsInitial.toFixed(1)}% avg`}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-stitch-muted">Initial Avg</p>
          <p className="mt-0.5 font-mono text-base font-bold text-white">
            {cp}
            {fmt2(initial)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-stitch-muted">Current Avg</p>
          <p
            className={`mt-0.5 font-mono text-base font-bold ${improved ? "text-stitch-accent" : "text-white"}`}
          >
            {cp}
            {fmt2(current)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-stitch-muted">
            {improved ? "Saved / Share" : "Increase / Share"}
          </p>
          <p
            className={`mt-0.5 font-mono text-base font-bold ${improved ? "text-stitch-accent" : "text-stitch-muted"}`}
          >
            {improved ? `${cp}${fmt2(reduction)}` : `${cp}${fmt2(increase)}`}
          </p>
        </div>
      </div>

      {improved ? (
        <>
          <div className="mb-3">
            <div className="flex h-2 gap-1 overflow-hidden rounded-full bg-stitch-pill">
              <div
                className="h-full rounded-full bg-stitch-accent transition-all"
                style={{ width: `${Math.min(pctVsInitial, 100)}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-[9px] text-stitch-muted">No improvement</span>
              <span className="text-[9px] font-medium text-stitch-accent">{pctVsInitial.toFixed(1)}% lower avg</span>
              <span className="text-[9px] text-stitch-muted">Initial avg</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-stitch-border/50 pt-3">
            <span className="text-[10px] uppercase tracking-wider text-stitch-muted">Total vs initial snapshot</span>
            <span className="font-mono text-sm font-bold text-stitch-accent">
              {cp}
              {fmt2(dollarEffect)} lower
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-stitch-border/60 bg-stitch-pill/30 p-3">
            <p className="text-[11px] leading-relaxed text-stitch-muted">
              Your recorded average is above the initial snapshot (for example after buys at higher prices). This is
              informational only — not a gain or loss.
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-stitch-border/50 pt-3">
            <span className="text-[10px] uppercase tracking-wider text-stitch-muted">
              Avg increase × current shares
            </span>
            <span className="font-mono text-sm font-semibold text-stitch-muted">
              {cp}
              {fmt2(dollarEffect)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
