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

  const handleCreateOwnPortfolio = () => {
    if (user) {
      exitDemo();
      navigate("/", { replace: true });
      return;
    }
    navigate("/auth?mode=signup");
  };

  return (
    <div
      className="sticky top-0 z-[90] border-b border-amber-500/30 bg-amber-950/35 px-3 py-2.5 backdrop-blur-md dark:bg-amber-950/40"
      role="status"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:text-left">
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-sm font-semibold leading-snug text-amber-50 sm:text-[15px]">
            You&apos;re exploring a demo portfolio
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-amber-100/70">
            Nothing here is your real account or a recommendation — it&apos;s practice data only.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Button
            type="button"
            size="sm"
            className="h-9 w-full bg-stitch-accent text-xs font-semibold text-black shadow-md shadow-stitch-accent/15 hover:bg-stitch-accent/90 sm:h-8 sm:w-auto"
            onClick={handleCreateOwnPortfolio}
          >
            {user ? "View my portfolio" : "Create your own portfolio"}
          </Button>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-end">
            {!user && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-amber-500/40 bg-stitch-bg/30 text-[11px] text-amber-50 hover:bg-stitch-card hover:text-white"
                onClick={() => navigate("/auth?mode=login")}
              >
                Sign in
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-amber-500/40 bg-stitch-bg/30 text-[11px] text-amber-50 hover:bg-stitch-card hover:text-white"
              onClick={() => resetGuidedDemo()}
            >
              Restart walkthrough
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-amber-500/40 bg-stitch-bg/30 text-[11px] text-amber-50 hover:bg-stitch-card hover:text-white"
              onClick={resetDemo}
            >
              Reset demo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-amber-500/50 bg-transparent text-[11px] font-semibold text-amber-100 hover:bg-stitch-card hover:text-white"
              onClick={exitDemo}
            >
              Exit demo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
