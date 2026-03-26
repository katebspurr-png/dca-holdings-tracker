import { useState } from "react";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClassificationAnswers } from "@/contexts/ExperienceContext";

const Q1_OPTIONS: { value: 0 | 1 | 2; label: string }[] = [
  { value: 0, label: "I'm just getting started" },
  { value: 1, label: "I track a few investments" },
  { value: 2, label: "I actively manage a portfolio" },
];

const Q2_OPTIONS: { value: 0 | 1 | 2; label: string }[] = [
  { value: 0, label: "No" },
  { value: 1, label: "A little" },
  { value: 2, label: "Yes" },
];

const Q3_OPTIONS: { value: 0 | 1 | 2; label: string }[] = [
  { value: 0, label: "Understand the basics" },
  { value: 1, label: "Track and explore my portfolio" },
  { value: 2, label: "Compare different scenarios" },
];

type Props = {
  onComplete: (answers: ClassificationAnswers) => void;
  onSkip: () => void;
};

export default function ExperienceClassification({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const [q1, setQ1] = useState<0 | 1 | 2 | null>(null);
  const [q2, setQ2] = useState<0 | 1 | 2 | null>(null);
  const [q3, setQ3] = useState<0 | 1 | 2 | null>(null);

  const finish = () => {
    if (q1 == null || q2 == null) return;
    onComplete({ q1, q2, q3: q3 ?? undefined });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-stitch-bg/95 backdrop-blur-md transition-opacity duration-300 sm:items-center">
      <div className="relative mx-auto mb-24 w-full max-w-lg px-4 sm:mb-0">
        <div className="overflow-hidden rounded-[32px] border border-stitch-border bg-stitch-card shadow-2xl">
          <div className="h-1 bg-stitch-pill">
            <div
              className="h-full bg-stitch-accent transition-all duration-300 ease-out"
              style={{ width: `${((step + 1) / 3) * 100}%` }}
            />
          </div>
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-stitch-muted">Personalize your experience</p>
              <button
                type="button"
                onClick={onSkip}
                className="shrink-0 text-xs font-medium text-stitch-muted transition-colors hover:text-white"
              >
                Skip
              </button>
            </div>

            {step === 0 && (
              <div className="animate-in fade-in-0 duration-200">
                <h2 className="font-[family-name:var(--font-heading)] text-lg font-extrabold text-white">
                  How do you usually manage your investments?
                </h2>
                <p className="mt-2 text-xs text-stitch-muted">This only adjusts labels and tips—not advice.</p>
                <ul className="mt-4 space-y-2">
                  {Q1_OPTIONS.map((o) => (
                    <li key={o.value}>
                      <button
                        type="button"
                        onClick={() => setQ1(o.value)}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                          q1 === o.value
                            ? "border-stitch-accent bg-stitch-accent/10 text-white"
                            : "border-stitch-border bg-stitch-pill/40 text-stitch-muted hover:border-stitch-border hover:text-white",
                        )}
                      >
                        {o.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step === 1 && (
              <div className="animate-in fade-in-0 duration-200">
                <h2 className="font-[family-name:var(--font-heading)] text-lg font-extrabold text-white">
                  Have you used tools to model or simulate investments before?
                </h2>
                <ul className="mt-4 space-y-2">
                  {Q2_OPTIONS.map((o) => (
                    <li key={o.value}>
                      <button
                        type="button"
                        onClick={() => setQ2(o.value)}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                          q2 === o.value
                            ? "border-stitch-accent bg-stitch-accent/10 text-white"
                            : "border-stitch-border bg-stitch-pill/40 text-stitch-muted hover:border-stitch-border hover:text-white",
                        )}
                      >
                        {o.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in-0 duration-200">
                <h2 className="font-[family-name:var(--font-heading)] text-lg font-extrabold text-white">
                  What are you hoping to do here?{" "}
                  <span className="text-sm font-normal text-stitch-muted">(optional)</span>
                </h2>
                <ul className="mt-4 space-y-2">
                  {Q3_OPTIONS.map((o) => (
                    <li key={o.value}>
                      <button
                        type="button"
                        onClick={() => setQ3(o.value)}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                          q3 === o.value
                            ? "border-stitch-accent bg-stitch-accent/10 text-white"
                            : "border-stitch-border bg-stitch-pill/40 text-stitch-muted hover:border-stitch-border hover:text-white",
                        )}
                      >
                        {o.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className={cn(
                  "flex items-center gap-1 text-sm text-stitch-muted transition-colors hover:text-white",
                  step === 0 ? "invisible" : "",
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              {step < 2 ? (
                <Button
                  disabled={(step === 0 && q1 == null) || (step === 1 && q2 == null)}
                  onClick={() => setStep((s) => s + 1)}
                  className="gap-2 bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={finish}
                  disabled={q1 == null || q2 == null}
                  className="gap-2 bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-[11px] text-stitch-muted/60">{step + 1} of 3</p>
      </div>
    </div>
  );
}
