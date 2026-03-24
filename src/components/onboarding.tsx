import { useState } from "react";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "positionpilot-onboarding-done";

export function getOnboardingDone(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function setOnboardingDone() {
  localStorage.setItem(STORAGE_KEY, "true");
}

export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
}

const STEPS = [
  {
    title: "Welcome to PositionPilot",
    body: "PositionPilot is a position planning tool: model how extra buys change your average cost, save scenarios, and compare outcomes — without telling you what to trade.",
    emoji: "✈️",
  },
  {
    title: "Your Holdings",
    body: "Add your stock positions here. Each holding tracks your average cost, shares, and current price. Tap any holding to open its full strategy workspace.",
    emoji: "📋",
  },
  {
    title: "Portfolio simulations",
    body: "The portfolio list can show 0–100 scores that only compare your holdings to each other using the same fixed-rung ladder math — like a spreadsheet column, not a buy list.",
    emoji: "🎯",
  },
  {
    title: "Portfolio ladder highlight",
    body: "One card may call out which position’s modeled ladder step has the strongest improvement-per-dollar right now. That’s internal math for your own review, not a recommendation.",
    emoji: "⚡",
  },
  {
    title: "Position Workspace",
    body: "Tap any holding for its workspace — budget-step simulator, DCA Calculator, transaction history, and position math (Insights) in one place.",
    emoji: "🔬",
  },
];

interface OnboardingProps {
  onDone: () => void;
}

export default function Onboarding({ onDone }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleDone = () => {
    setOnboardingDone();
    setExiting(true);
    setTimeout(onDone, 300);
  };

  const handleNext = () => {
    if (isLast) {
      handleDone();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end justify-center transition-opacity duration-300 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 bg-stitch-bg/90 backdrop-blur-md" />

      <div className="relative mx-auto mb-24 w-full max-w-lg px-4">
        <div className="overflow-hidden rounded-[32px] border border-stitch-border bg-stitch-card shadow-2xl">
          <div className="h-1 bg-stitch-pill">
            <div
              className="h-full bg-stitch-accent transition-all duration-300 ease-out"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
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
                onClick={handleDone}
                className="text-xs text-stitch-muted transition-colors hover:text-white"
              >
                Don&apos;t show again
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-3xl">{current.emoji}</div>
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-extrabold leading-tight tracking-tight text-white">
                {current.title}
              </h2>
              <p className="text-sm leading-relaxed text-stitch-muted">{current.body}</p>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className={`flex items-center gap-1 text-sm text-stitch-muted transition-colors hover:text-white ${
                  step === 0 ? "invisible" : ""
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>

              <Button
                onClick={handleNext}
                className="gap-2 bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
              >
                {isLast ? "Get Started" : "Next"}
                {!isLast && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] text-stitch-muted/60">
          {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
