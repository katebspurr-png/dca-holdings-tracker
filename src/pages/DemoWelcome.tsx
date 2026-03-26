import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { setDemoWelcomeDismissed } from "@/lib/demoWelcome";

const BULLETS = [
  "See a sample portfolio",
  "Understand your average cost and positioning",
  'Test "what-if" scenarios',
  "See how to improve your position over time",
];

export default function DemoWelcome() {
  const navigate = useNavigate();

  const goToDemo = (skipWalkthrough: boolean) => {
    setDemoWelcomeDismissed();
    if (skipWalkthrough) {
      navigate("/demo?skipWalkthrough=1", { replace: true });
    } else {
      navigate("/demo", { replace: true });
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col bg-stitch-bg px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] font-sans text-white antialiased sm:justify-center sm:py-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col sm:flex-none">
        <div className="mb-2 text-center">
          <span className="font-[family-name:var(--font-heading)] text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-stitch-accent">
            Demo
          </span>
        </div>
        <h1 className="text-center font-[family-name:var(--font-heading)] text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-[1.75rem]">
          Explore how PositionPilot works
        </h1>
        <p className="mt-2 text-center text-sm text-stitch-muted">
          Sample data only — explore safely, then sign up when you want your own portfolio.
        </p>

        <ul className="mt-8 space-y-3.5" aria-label="What you can try in the demo">
          {BULLETS.map((line) => (
            <li key={line} className="flex gap-3 text-left text-sm leading-snug text-stitch-muted-soft">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stitch-accent/15 text-stitch-accent"
                aria-hidden
              >
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
              <span className="pt-0.5 text-white/90">{line}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-3 pt-10 sm:mt-10 sm:pt-0">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full bg-stitch-accent text-base font-semibold text-black shadow-lg shadow-stitch-accent/15 hover:bg-stitch-accent/90"
            onClick={() => goToDemo(false)}
          >
            Enter Demo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-11 w-full text-[13px] font-medium text-stitch-muted hover:bg-stitch-pill hover:text-white"
            onClick={() => goToDemo(true)}
          >
            Skip walkthrough
          </Button>
        </div>
      </div>
    </div>
  );
}
