import type { ProductTourPreviewId } from "@/walkthrough/productTourSteps";
import { Wallet, Sparkles, Columns2, Calculator, TrendingUp, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

const row = "flex items-center gap-2 rounded-lg border border-stitch-border/60 bg-stitch-pill/40 px-2 py-1.5";

export default function WalkthroughStepPreview({
  id,
  className,
}: {
  id: ProductTourPreviewId;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-stitch-border/80 bg-stitch-pill/30 p-4",
        className,
      )}
    >
      {id === "welcome" && (
        <div className="flex flex-col items-center justify-center gap-3 py-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stitch-accent/15 ring-1 ring-stitch-accent/30">
            <Plane className="h-7 w-7 text-stitch-accent" aria-hidden />
          </div>
          <div className="h-1 w-16 rounded-full bg-stitch-muted/20" />
          <div className="h-1 w-24 rounded-full bg-stitch-muted/15" />
        </div>
      )}

      {id === "portfolio" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-stitch-muted">
            <Wallet className="h-4 w-4 text-stitch-accent" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Portfolio</span>
          </div>
          <div className={row}>
            <span className="h-6 w-6 rounded-full bg-stitch-accent/20 text-center text-[10px] font-bold leading-6 text-stitch-accent">
              A
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="h-2 w-16 rounded bg-white/10" />
              <div className="h-1.5 w-24 rounded bg-stitch-muted/20" />
            </div>
            <div className="h-2 w-10 rounded bg-stitch-muted/25" />
          </div>
          <div className={row}>
            <span className="h-6 w-6 rounded-full bg-white/10 text-center text-[10px] font-bold leading-6">N</span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="h-2 w-14 rounded bg-white/10" />
              <div className="h-1.5 w-20 rounded bg-stitch-muted/20" />
            </div>
            <div className="h-2 w-10 rounded bg-stitch-muted/25" />
          </div>
        </div>
      )}

      {id === "strategyOptimizer" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-stitch-muted">
            <Sparkles className="h-4 w-4 text-stitch-accent" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Compare (illustrative)</span>
          </div>
          <div className="flex items-end justify-between gap-2 px-1 pt-2">
            <div className="flex w-6 flex-col items-center gap-1">
              <div className="h-10 w-full rounded-t-md bg-stitch-accent/50" />
              <div className="h-1 w-full rounded-full bg-stitch-muted/30" />
            </div>
            <div className="flex w-6 flex-col items-center gap-1">
              <div className="h-6 w-full rounded-t-md bg-stitch-accent/25" />
              <div className="h-1 w-full rounded-full bg-stitch-muted/30" />
            </div>
            <div className="flex w-6 flex-col items-center gap-1">
              <div className="h-14 w-full rounded-t-md bg-stitch-accent/70" />
              <div className="h-1 w-full rounded-full bg-stitch-muted/30" />
            </div>
            <div className="flex w-6 flex-col items-center gap-1">
              <div className="h-8 w-full rounded-t-md bg-stitch-accent/35" />
              <div className="h-1 w-full rounded-full bg-stitch-muted/30" />
            </div>
          </div>
        </div>
      )}

      {id === "whatIf" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-stitch-muted">
            <Columns2 className="h-4 w-4 text-stitch-accent" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-wide">What-If</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-stitch-border/60 bg-stitch-card/50 p-2">
              <div className="mb-2 h-1.5 w-12 rounded bg-stitch-muted/30" />
              <div className="space-y-1">
                <div className="h-1 w-full rounded bg-white/5" />
                <div className="h-1 w-[80%] rounded bg-white/5" />
              </div>
            </div>
            <div className="rounded-xl border border-stitch-accent/25 bg-stitch-accent/5 p-2">
              <div className="mb-2 h-1.5 w-12 rounded bg-stitch-accent/40" />
              <div className="space-y-1">
                <div className="h-1 w-full rounded bg-white/5" />
                <div className="h-1 w-[60%] rounded bg-white/5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {id === "holdingWorkspace" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-stitch-muted">
            <Calculator className="h-4 w-4 text-stitch-accent" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Simulate → apply</span>
          </div>
          <div className="rounded-xl border border-stitch-border/60 bg-stitch-card/40 p-3">
            <div className="mb-2 flex justify-between">
              <div className="h-2 w-20 rounded bg-white/10" />
              <div className="h-2 w-14 rounded bg-stitch-accent/30" />
            </div>
            <div className="mb-3 h-8 w-full rounded-lg border border-stitch-border/50 bg-stitch-pill/50" />
            <div className="flex gap-2">
              <div className="h-7 flex-1 rounded-lg bg-stitch-muted/20" />
              <div className="h-7 w-16 rounded-lg bg-stitch-accent/40" />
            </div>
          </div>
        </div>
      )}

      {id === "progress" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-stitch-muted">
            <TrendingUp className="h-4 w-4 text-stitch-accent" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Progress</span>
          </div>
          <div className="flex h-20 items-end justify-between gap-1.5 px-1">
            {[40, 55, 48, 62, 58, 70].map((pct, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full max-w-[10px] rounded-t-sm bg-stitch-accent/40"
                  style={{ height: `${pct}%` }}
                />
              </div>
            ))}
          </div>
          <div className="h-px w-full bg-stitch-border/50" />
        </div>
      )}

      {id === "finish" && (
        <div className="flex flex-col items-center justify-center gap-3 py-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-2 w-2 rounded-full bg-stitch-accent/60" />
            ))}
          </div>
          <div className="text-center text-[11px] text-stitch-muted">Ready when you are</div>
        </div>
      )}
    </div>
  );
}
