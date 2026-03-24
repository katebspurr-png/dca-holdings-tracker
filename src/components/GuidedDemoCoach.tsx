import { useExperience } from "@/contexts/ExperienceContext";
import { GUIDED_DEMO_STEPS } from "@/walkthrough/guidedDemoSteps";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function GuidedDemoCoach() {
  const { guidedDemoActive, guidedDemoStepIndex, advanceGuidedDemo, skipGuidedDemo } = useExperience();

  if (!guidedDemoActive) return null;

  const step = GUIDED_DEMO_STEPS[guidedDemoStepIndex] ?? GUIDED_DEMO_STEPS[0]!;
  const isLast = guidedDemoStepIndex >= GUIDED_DEMO_STEPS.length - 1;

  return (
    <div
      className="pointer-events-auto fixed bottom-28 left-4 right-4 z-[95] mx-auto max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300 sm:bottom-24"
      role="region"
      aria-label="Guided preview"
    >
      <div className="rounded-2xl border border-stitch-border bg-stitch-card/95 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-stitch-accent">
              Guided preview · step {guidedDemoStepIndex + 1} of {GUIDED_DEMO_STEPS.length}
            </p>
            <h3 className="mt-1 text-sm font-bold text-white">{step.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-stitch-muted">{step.body}</p>
          </div>
          <button
            type="button"
            onClick={skipGuidedDemo}
            className="shrink-0 rounded-lg p-1 text-stitch-muted transition-colors hover:bg-stitch-pill hover:text-white"
            aria-label="Skip guided preview"
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
