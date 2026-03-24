import { useDemoMode } from "@/contexts/DemoModeContext";
import { Button } from "@/components/ui/button";

export default function DemoModeBanner() {
  const { isDemoMode, exitDemo, resetDemo } = useDemoMode();

  if (!isDemoMode) return null;

  return (
    <div
      className="sticky top-0 z-[90] border-b border-amber-500/25 bg-amber-500/10 px-3 py-2 backdrop-blur-sm"
      role="status"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2 text-center sm:justify-between sm:text-left">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-amber-200/95">Demo Mode</p>
          <p className="text-[11px] leading-snug text-stitch-muted">
            You&apos;re exploring with sample data — modeling only, not your portfolio.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 border-amber-500/35 bg-stitch-bg/40 text-[11px] text-amber-100 hover:bg-stitch-card hover:text-white"
            onClick={resetDemo}
          >
            Reset demo
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 bg-stitch-accent text-[11px] font-semibold text-black hover:bg-stitch-accent/90"
            onClick={exitDemo}
          >
            Exit demo
          </Button>
        </div>
      </div>
    </div>
  );
}
