import { Sparkles, Zap, Target, BarChart3, DollarSign } from "lucide-react";
import WaitlistForm from "@/components/WaitlistForm";

const MOCK_ALLOCATIONS = [
  { ticker: "NVDA", amount: "$700", newAvg: "$118.40", improvement: "-$24.40" },
  { ticker: "AAPL", amount: "$500", newAvg: "$185.20", improvement: "-$13.30" },
  { ticker: "SHOP", amount: "$400", newAvg: "$121.80", improvement: "-$10.70" },
  { ticker: "MSFT", amount: "$400", newAvg: "$378.50", improvement: "-$8.90" },
];

export default function CapitalOptimizer() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 800,
                  fontSize: "1.25rem",
                  letterSpacing: "-0.02em",
                }}
              >
                Capital Optimizer
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Coming soon</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-8 space-y-8">

        <section className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            The Capital Optimizer takes your total budget and automatically figures out
            the best way to split it across your positions — maximizing average cost
            improvement across your entire portfolio with one decision.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: DollarSign, label: "Enter your budget" },
              { icon: Target, label: "Pick your positions" },
              { icon: BarChart3, label: "See the allocation" },
              { icon: Zap, label: "Apply in one tap" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3"
              >
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-medium">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Preview — $2,000 budget example
          </p>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Allocation Plan</span>
              <span className="text-xs font-mono text-primary font-semibold">$2,000 budget</span>
            </div>
            <div className="divide-y divide-border">
              {MOCK_ALLOCATIONS.map((item, i) => (
                <div key={item.ticker} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground/40 font-mono w-4">{i + 1}</span>
                    <span className="text-sm font-bold font-mono">{item.ticker}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs font-mono font-semibold">{item.amount}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">invest</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono">{item.newAvg}</p>
                      <p className="text-[10px] text-primary font-mono font-semibold">{item.improvement}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 bg-primary/5 border-t border-border">
              <p className="text-[11px] text-center text-muted-foreground">
                Portfolio average cost reduced across all 4 positions
              </p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
            Example only — not real data
          </p>
        </section>

        <div className="border-t border-border" />

        <section>
          <div className="mb-5">
            <h2
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: "1.1rem",
                letterSpacing: "-0.02em",
              }}
            >
              Get early access
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tell us what you're most excited about and we'll let you know when it's ready.
            </p>
          </div>
          <WaitlistForm defaultFeature="optimizer" />
        </section>

      </main>
    </div>
  );
}