import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const FEATURES = [
  { id: "optimizer", label: "Compare allocations", description: "Model budget splits across positions and resulting average costs" },
  { id: "scenario_compare", label: "Scenario comparison", description: "Compare saved scenarios side-by-side" },
  { id: "alerts", label: "Price threshold alerts", description: "Get notified when a price crosses a level you choose" },
  { id: "auto_price", label: "Auto Price Refresh", description: "Prices update automatically without manual refresh" },
  { id: "portfolio_gameplan", label: "Portfolio scenarios (roadmap)", description: "Step-by-step hypothetical deployment across holdings — illustrative only" },
];

interface WaitlistFormProps {
  defaultFeature?: string;
}

export default function WaitlistForm({ defaultFeature }: WaitlistFormProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(defaultFeature ? [defaultFeature] : [])
  );
  const [betaTester, setBetaTester] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one feature you're interested in.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await (supabase as any).from("waitlist").upsert({
        user_id: user?.id,
        email: user?.email,
        features: Array.from(selected),
        beta_tester: betaTester,
        updated_at: new Date().toISOString(),
      }, { onConflict: "email" });

      if (error) throw error;
      setDone(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stitch-accent/15">
          <CheckCircle className="h-6 w-6 text-stitch-accent" />
        </div>
        <div>
          <p className="font-semibold text-white">You're on the list!</p>
          <p className="mt-1 text-sm text-stitch-muted">
            We'll reach out when these features launch.
            {betaTester && " Beta testers get early access."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stitch-muted">
          Which features interest you most?
        </p>
        <div className="space-y-2.5">
          {FEATURES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => toggle(f.id)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                selected.has(f.id)
                  ? "border-stitch-accent/40 bg-stitch-accent/10"
                  : "border-stitch-border bg-stitch-pill/30 hover:bg-stitch-pill/50"
              }`}
            >
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  selected.has(f.id) ? "border-stitch-accent bg-stitch-accent" : "border-stitch-muted/40"
                }`}
              >
                {selected.has(f.id) && (
                  <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 text-black" aria-hidden>
                    <path
                      d="M1 4l3 3 5-6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight text-white">{f.label}</p>
                <p className="mt-0.5 text-[11px] text-stitch-muted">{f.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setBetaTester(!betaTester)}
        className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
          betaTester
            ? "border-stitch-accent/40 bg-stitch-accent/10"
            : "border-dashed border-stitch-border hover:bg-stitch-pill/30"
        }`}
      >
        <div
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
            betaTester ? "border-stitch-accent bg-stitch-accent" : "border-stitch-muted/40"
          }`}
        >
          {betaTester && (
            <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 text-black" aria-hidden>
              <path
                d="M1 4l3 3 5-6"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-white">I'd like to be a beta tester 🧪</p>
          <p className="mt-0.5 text-[11px] text-stitch-muted">Get early access before public launch</p>
        </div>
      </button>

      <Button
        className="w-full gap-2 bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
        onClick={handleSubmit}
        disabled={loading || selected.size === 0}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Join the Waitlist
          </>
        )}
      </Button>

      <p className="text-center text-[10px] text-stitch-muted/60">
        We'll only email you about PositionPilot. No spam, ever.
      </p>
    </div>
  );
}
