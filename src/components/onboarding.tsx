import { useState } from "react";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCT_TOUR_STEPS } from "@/walkthrough/productTourSteps";
import WalkthroughStepPreview from "@/components/WalkthroughStepPreview";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "positionpilot-onboarding-done";

const DISCLAIMER =
  "PositionPilot models outcomes from your inputs. It is not financial advice and does not recommend securities.";

export function getOnboardingDone(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function setOnboardingDone() {
  localStorage.setItem(STORAGE_KEY, "true");
}

export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
}

interface OnboardingProps {
  onDone: () => void;
  /** Shown on the final step when the user has no holdings yet. */
  onSetUpPortfolio?: () => void;
  showSetUpPortfolioCta?: boolean;
  /** Load sample portfolio sandbox (final step). */
  onTryDemo?: () => void;
}

export default function Onboarding({
  onDone,
  onSetUpPortfolio,
  showSetUpPortfolioCta,
  onTryDemo,
}: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  const steps = PRODUCT_TOUR_STEPS;
  const current = steps[step]!;
  const isLast = step === steps.length - 1;

  const finishAndClose = (afterClose?: () => void) => {
    setOnboardingDone();
    setExiting(true);
    window.setTimeout(() => {
      onDone();
      afterClose?.();
    }, 300);
  };

  const handleSkip = () => finishAndClose();

  const handleNext = () => {
    if (isLast) {
      finishAndClose();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-end justify-center transition-opacity duration-300 sm:items-center",
        exiting ? "opacity-0" : "opacity-100",
      )}
    >
      <div className="absolute inset-0 bg-stitch-bg/90 backdrop-blur-md" />

      <div className="relative mx-auto mb-24 w-full max-w-lg px-4 sm:mb-0">
        <div className="overflow-hidden rounded-[32px] border border-stitch-border bg-stitch-card shadow-2xl">
          <div className="h-1 bg-stitch-pill">
            <div
              className="h-full bg-stitch-accent transition-all duration-300 ease-out"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 shrink-0 rounded-full transition-all duration-300 ${
                      i === step
                        ? "w-6 bg-stitch-accent"
                        : i < step
                          ? "w-1.5 bg-stitch-accent/50"
                          : "w-1.5 bg-stitch-muted/25"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleSkip}
                className="shrink-0 text-xs font-medium text-stitch-muted transition-colors hover:text-white"
              >
                Skip
              </button>
            </div>

            <div
              key={step}
              className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
            >
              <WalkthroughStepPreview id={current.id} className="mb-4" />

              <div className="space-y-3">
                <h2 className="font-[family-name:var(--font-heading)] text-xl font-extrabold leading-tight tracking-tight text-white">
                  {current.title}
                </h2>
                <p className="text-sm leading-relaxed text-stitch-muted">{current.body}</p>
              </div>
            </div>

            {current.showDisclaimer && (
              <p className="mt-4 text-center text-[10px] leading-snug text-stitch-muted/70" role="note">
                {DISCLAIMER}
              </p>
            )}

            <div className="mt-6 flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className={`mt-2 flex shrink-0 items-center gap-1 text-sm text-stitch-muted transition-colors hover:text-white ${
                  step === 0 ? "invisible" : ""
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>

              {isLast ? (
                <div className="flex min-w-0 flex-1 flex-col items-stretch gap-2 sm:max-w-[280px]">
                  <Button
                    onClick={() => finishAndClose()}
                    className="gap-2 bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
                  >
                    Start exploring
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  {showSetUpPortfolioCta && onSetUpPortfolio && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => finishAndClose(onSetUpPortfolio)}
                      className="border-stitch-border bg-stitch-pill text-stitch-muted-soft hover:bg-stitch-card hover:text-white"
                    >
                      Add your portfolio
                    </Button>
                  )}
                  {onTryDemo && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => finishAndClose(onTryDemo)}
                      className="border-stitch-border bg-stitch-pill text-stitch-muted-soft hover:bg-stitch-card hover:text-white"
                    >
                      Try demo
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  onClick={handleNext}
                  className="shrink-0 gap-2 bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] text-stitch-muted/60">
          {step + 1} of {steps.length}
        </p>
      </div>
    </div>
  );
}
