import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const FEATURES = [
  { id: "optimizer", label: "Capital Allocation Optimizer", description: "Auto-allocate a budget across positions for max impact" },
  { id: "scenario_compare", label: "Scenario Comparison", description: "Compare saved strategies side-by-side" },
  { id: "alerts", label: "Opportunity Alerts", description: "Get notified when a position hits your DCA zone" },
  { id: "auto_price", label: "Auto Price Refresh", description: "Prices update automatically without manual refresh" },
  { id: "portfolio_gameplan", label: "Portfolio Game Plan", description: "Step-by-step capital deployment across your whole portfolio" },
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
      const { error } = await supabase.from("waitlist").upsert({
        user_id: user?.id,
        email: user?.email,
        features: Array.from(selected),
        beta_tester: betaTester,
        updated_at: new Date().toISOString(),
      }, { onConflict: "email" });

      if (error) throw error;
      setDone(true);
    } catch (err: any) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-semibold">You're on the list!</p>
          <p className="text-sm text-muted-foreground mt-1">
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
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Which features interest you most?
        </p>
        <div className="space-y-2.5">
          {FEATURES.map((f) => (
            <button
              key={f.id}
              onClick={() => toggle(f.id)}
              className={`w-full flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                selected.has(f.id)
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card hover:bg-muted/30"
              }`}
            >
              <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                selected.has(f.id)
                  ? "bg-primary border-primary"
                  : "border-muted-foreground/30"
              }`}>
                {selected.has(f.id) && (
                  <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-primary-foreground">
                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{f.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{f.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setBetaTester(!betaTester)}
        className={`w-full flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
          betaTester
            ? "border-primary/40 bg-primary/5"
            : "border-dashed border-border hover:bg-muted/30"
        }`}
      >
        <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
          betaTester ? "bg-primary border-primary" : "border-muted-foreground/30"
        }`}>
          {betaTester && (
            <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-primary-foreground">
              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm font-medium">I'd like to be a beta tester 🧪</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Get early access before public launch</p>
        </div>
      </button>

      <Button
        className="w-full gap-2"
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

      <p className="text-[10px] text-muted-foreground/40 text-center">
        We'll only email you about PositionPilot. No spam, ever.
      </p>
    </div>
  );
}