import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { useExperience } from "@/contexts/ExperienceContext";
import { Button } from "@/components/ui/button";

export default function DemoModeBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemoMode, exitDemo, resetDemo } = useDemoMode();
  const { resetGuidedDemo } = useExperience();

  if (!isDemoMode) return null;

  return (
    <div
      className="sticky top-0 z-[90] border-b border-amber-500/25 bg-amber-500/10 px-3 py-2 backdrop-blur-sm"
      role="status"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 sm:text-left">
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-xs font-semibold tracking-wide text-amber-200/95">You&apos;re in Demo Mode</p>
          <p className="text-[11px] leading-snug text-stitch-muted">
            Sample data only — modeling and exploration, not your portfolio.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
          {!user && (
            <>
              <Button
                type="button"
                size="sm"
                className="h-8 bg-stitch-accent text-[11px] font-semibold text-black hover:bg-stitch-accent/90"
                onClick={() => navigate("/auth")}
              >
                Create account
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-amber-500/35 bg-stitch-bg/40 text-[11px] text-amber-100 hover:bg-stitch-card hover:text-white"
                onClick={() => navigate("/auth")}
              >
                Use your own data
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 border-amber-500/35 bg-stitch-bg/40 text-[11px] text-amber-100 hover:bg-stitch-card hover:text-white"
            onClick={() => {
              resetGuidedDemo();
            }}
          >
            Replay tour
          </Button>
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
            className="h-8 border border-amber-500/40 bg-stitch-bg/40 text-[11px] font-semibold text-amber-100 hover:bg-stitch-card hover:text-white"
            onClick={exitDemo}
          >
            Exit demo
          </Button>
        </div>
      </div>
    </div>
  );
}
