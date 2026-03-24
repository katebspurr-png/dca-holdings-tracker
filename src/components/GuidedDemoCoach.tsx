import { useAuth } from "@/contexts/AuthContext";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { useExperience } from "@/contexts/ExperienceContext";
import { GUIDED_DEMO_STEPS } from "@/walkthrough/guidedDemoSteps";
import { PRE_AUTH_GUIDED_DEMO_STEPS } from "@/walkthrough/preAuthGuidedDemoSteps";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function GuidedDemoCoach() {
  const { session } = useAuth();
  const { isDemoMode } = useDemoMode();
  const { guidedDemoActive, guidedDemoStepIndex, advanceGuidedDemo, skipGuidedDemo } = useExperience();

  if (!guidedDemoActive) return null;

  const preAuthFlow = !session && isDemoMode;
  const steps = preAuthFlow ? PRE_AUTH_GUIDED_DEMO_STEPS : GUIDED_DEMO_STEPS;
  const step = steps[guidedDemoStepIndex] ?? steps[0]!;
  const isLast = guidedDemoStepIndex >= steps.length - 1;
  const headerLabel = preAuthFlow ? "Walkthrough" : "Guided preview";

  return (
    <div
      className="pointer-events-auto fixed bottom-28 left-4 right-4 z-[95] mx-auto max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300 sm:bottom-24"
      role="region"
      aria-label={preAuthFlow ? "Demo walkthrough" : "Guided preview"}
    >
      <div className="rounded-2xl border border-stitch-border bg-stitch-card/95 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-stitch-accent">
              {headerLabel} · step {guidedDemoStepIndex + 1} of {steps.length}
            </p>
            <h3 className="mt-1 text-sm font-bold text-white">{step.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-stitch-muted">{step.body}</p>
          </div>
          <button
            type="button"
            onClick={skipGuidedDemo}
            className="shrink-0 rounded-lg p-1 text-stitch-muted transition-colors hover:bg-stitch-pill hover:text-white"
            aria-label={preAuthFlow ? "Skip walkthrough" : "Skip guided preview"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-stitch-muted hover:text-white"
            onClick={skipGuidedDemo}
          >
            Skip
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-stitch-accent text-xs font-semibold text-black hover:bg-stitch-accent/90"
            onClick={advanceGuidedDemo}
          >
            {isLast ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
