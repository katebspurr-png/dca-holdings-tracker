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
    body: "PositionPilot is a strategy engine for managing your stock positions. It helps you answer one key question: if I buy more, how much will it actually help?",
    emoji: "✈️",
  },
  {
    title: "Your Holdings",
    body: "Add your stock positions here. Each holding tracks your average cost, shares, and current price. Tap any holding to open its full strategy workspace.",
    emoji: "📋",
  },
  {
    title: "DCA Opportunities",
    body: "This section scores every position by how efficiently a $500 investment would lower your average cost. Higher score = better opportunity right now.",
    emoji: "🎯",
  },
  {
    title: "Next Best Move",
    body: "Can't decide where to invest? This card tells you which position would benefit most from your next dollar, calculated automatically across your portfolio.",
    emoji: "⚡",
  },
  {
    title: "Position Workspace",
    body: "Tap any holding to access its full workspace — Goal Ladder, DCA Calculator, transaction history, and strategy insights all in one place.",
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
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg mx-auto mb-24 px-4">
        <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step
                        ? "w-6 bg-primary"
                        : i < step
                        ? "w-1.5 bg-primary/40"
                        : "w-1.5 bg-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={handleDone}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-3xl">{current.emoji}</div>
              <h2
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 800,
                  fontSize: "1.25rem",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}
              >
                {current.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {current.body}
              </p>
            </div>

            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className={`flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors ${
                  step === 0 ? "invisible" : ""
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>

              <Button onClick={handleNext} className="gap-2">
                {isLast ? "Get Started" : "Next"}
                {!isLast && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/40 mt-3">
          {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}