import { useEffect, useState, useCallback, useRef } from "react";
import { Moon, Sun, Download, Upload, RotateCcw, Crown, Check, LogOut, BookOpen, ExternalLink } from "lucide-react";
import { resetOnboarding } from "@/components/onboarding";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { resetAll, exportData, importData } from "@/lib/storage";
import { ENABLE_LOOKUP_LIMIT } from "@/lib/pro";
import ProSettings from "@/components/ProSettings";
import { toast } from "sonner";
import { getActivePlan, setUserPlan, type PlanType } from "@/lib/feature-access";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { getDemoEntryPath } from "@/lib/demoWelcome";
import { useExperience } from "@/contexts/ExperienceContext";

export default function Settings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isDemoMode, exitDemo } = useDemoMode();
  const { resetGuidedDemo } = useExperience();

  const handleSignOut = useCallback(async () => {
    await signOut();
    toast.success("Signed out");
  }, [signOut]);

  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const handleExport = useCallback(() => {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dca-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported");
  }, []);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importData(reader.result as string);
        toast.success("Data imported");
      } catch {
        toast.error("Invalid backup file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handleReset = useCallback(() => {
    resetAll();
    toast.success(
      isDemoMode ? "Demo reset to the original sample data" : "Portfolio cleared on this device",
    );
  }, [isDemoMode]);

  const [plan, setPlan] = useState(getActivePlan);

  const togglePlan = () => {
    const next: PlanType = plan === "premium" ? "free" : "premium";
    setUserPlan(next);
    setPlan(next);
    toast.success(next === "premium" ? "Premium preview enabled on this device" : "Using free tier on this device");
  };

  const cardClass =
    "relative overflow-hidden rounded-[32px] border border-stitch-border bg-stitch-card p-6 shadow-lg";
  const sectionTitle = "text-[11px] font-semibold uppercase tracking-wider text-stitch-muted";
  const outlineBtn =
    "border-stitch-border bg-stitch-pill text-stitch-muted-soft hover:bg-stitch-card hover:text-white";

  return (
    <div className="relative min-h-[max(884px,100dvh)] overflow-x-hidden bg-stitch-bg pb-28 font-sans text-white antialiased">
      <main className="relative z-10 mx-auto flex max-w-lg flex-1 flex-col gap-4 px-4 pt-12 sm:px-6 md:px-8">
        {/* Plan */}
        <section className={cardClass}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-stitch-accent/10 blur-3xl" />
          <div className="relative z-10 space-y-4">
            <h2 className={sectionTitle}>Plan</h2>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Crown className={`h-5 w-5 shrink-0 ${plan === "premium" ? "text-stitch-accent" : "text-stitch-muted"}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">
                    {plan === "premium" ? "Premium" : "Free"}
                    {plan === "premium" && (
                      <Badge
                        variant="secondary"
                        className="ml-2 h-4 border-0 bg-stitch-accent/15 px-1.5 text-[9px] text-stitch-accent"
                      >
                        Active
                      </Badge>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-stitch-muted">
                    {plan === "premium"
                      ? "Premium preview on this device — no payment is processed yet."
                      : "Core tools are free. Toggle below to preview premium on this device only."}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant={plan === "premium" ? "outline" : "default"}
                className={
                  plan === "premium"
                    ? `h-8 shrink-0 text-xs ${outlineBtn}`
                    : "h-8 shrink-0 bg-stitch-accent text-xs font-semibold text-black hover:bg-stitch-accent/90"
                }
                onClick={togglePlan}
              >
                {plan === "premium" ? "Turn off premium preview" : "Enable premium preview"}
              </Button>
            </div>
            <p className="rounded-xl border border-stitch-border/60 bg-stitch-pill/40 px-3 py-2 text-[10px] leading-relaxed text-stitch-muted">
              App Store billing is not wired up yet. This switch stores your choice on this device so you can test
              paywalled features. It is not a subscription charge.
            </p>
            {plan === "free" && (
              <div className="space-y-2 border-t border-stitch-border pt-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-stitch-muted/80">
                  Included with Premium today
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {["Scenario comparison (side-by-side)", "Compare allocations (budget lab)", "Unlimited scenarios per holding"].map(
                    (f) => (
                      <div key={f} className="flex items-center gap-1.5 text-[11px] text-stitch-muted">
                        <Check className="h-3 w-3 shrink-0 text-stitch-accent" />
                        {f}
                      </div>
                    )
                  )}
                </div>
                <p className="text-[10px] leading-relaxed text-stitch-muted/60">
                  Roadmap (not in the app yet): price threshold alerts, auto price refresh, custom budget rungs / targets.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className={cardClass}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-stitch-accent/10 blur-3xl" />
          <div className="relative z-10 space-y-2">
            <h2 className={sectionTitle}>Disclaimer</h2>
            <p className="text-[11px] leading-relaxed text-stitch-muted">
              PositionPilot is a personal planning tool: it runs math on the positions and scenarios you enter. It does not
              provide investment, tax, or legal advice, predict returns, or tell you what to buy or sell.
            </p>
          </div>
        </section>

        <section className={cardClass}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-stitch-accent/10 blur-3xl" />
          <div className="relative z-10 space-y-3">
            <h2 className={sectionTitle}>Legal</h2>
            <p className="text-[11px] leading-relaxed text-stitch-muted">
              Privacy Policy and Terms of Use describe how the app handles your data and acceptable use. Have counsel
              review and add your support contact and governing law where noted before launch.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button variant="outline" size="sm" className={outlineBtn} asChild>
                <a href="/legal/privacy.html" target="_blank" rel="noopener noreferrer" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Privacy Policy
                </a>
              </Button>
              <Button variant="outline" size="sm" className={outlineBtn} asChild>
                <a href="/legal/terms.html" target="_blank" rel="noopener noreferrer" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Terms of Use
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className={cardClass}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-stitch-accent/10 blur-3xl" />
          <div className="relative z-10 space-y-4">
            <h2 className={sectionTitle}>Demo mode</h2>
            <p className="text-[11px] leading-relaxed text-stitch-muted">
              Explore the app with sample positions and sandboxed changes. Nothing you do in demo is saved to your real
              portfolio or synced to the cloud.
            </p>
            <div className="flex flex-wrap gap-2">
              {isDemoMode ? (
                <>
                  <Button size="sm" variant="outline" className={outlineBtn} onClick={() => resetGuidedDemo()}>
                    Restart walkthrough
                  </Button>
                  <Button size="sm" variant="outline" className={outlineBtn} onClick={exitDemo}>
                    Exit demo mode
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  className="h-8 bg-stitch-accent text-xs font-semibold text-black hover:bg-stitch-accent/90"
                  onClick={() => navigate(getDemoEntryPath())}
                >
                  Enter demo mode
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-stitch-accent/10 blur-3xl" />
          <div className="relative z-10 space-y-4">
            <h2 className={sectionTitle}>Appearance</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sun className={`h-5 w-5 ${!dark ? "text-stitch-accent" : "text-stitch-muted"}`} />
                <span className={`text-sm font-medium ${!dark ? "text-white" : "text-stitch-muted"}`}>Light</span>
              </div>
              <Switch id="dark-mode" checked={dark} onCheckedChange={setDark} />
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${dark ? "text-white" : "text-stitch-muted"}`}>Dark</span>
                <Moon className={`h-5 w-5 ${dark ? "text-stitch-accent" : "text-stitch-muted"}`} />
              </div>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className={cardClass}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-stitch-accent/10 blur-3xl" />
          <div className="relative z-10 space-y-4">
            <h2 className={sectionTitle}>Data</h2>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleExport} size="sm" variant="outline" className={outlineBtn}>
                <Download className="mr-1.5 h-4 w-4" />
                Export Data
              </Button>
              <Button onClick={() => fileRef.current?.click()} size="sm" variant="outline" className={outlineBtn}>
                <Upload className="mr-1.5 h-4 w-4" />
                Import Data
              </Button>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            </div>
            <div className="border-t border-stitch-border pt-4">
              <p className="mb-2 text-[10px] leading-relaxed text-stitch-muted/80">
                {isDemoMode
                  ? "Resets the demo sandbox to the original sample dataset."
                  : "Removes all holdings and scenarios stored on this device for your account."}
              </p>
              <Button onClick={handleReset} size="sm" variant="destructive">
                <RotateCcw className="mr-1.5 h-4 w-4" />
                {isDemoMode ? "Reset demo sample" : "Clear portfolio"}
              </Button>
            </div>
          </div>
        </section>

        {/* Pro Settings */}
        {ENABLE_LOOKUP_LIMIT && (
          <section className={cardClass}>
            <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-stitch-accent/10 blur-3xl" />
            <div className="relative z-10 space-y-4">
              <h2 className={sectionTitle}>Lookup Limits</h2>
              <ProSettings />
            </div>
          </section>
        )}

        {/* Account */}
        <section className={cardClass}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-stitch-accent/10 blur-3xl" />
          <div className="relative z-10 space-y-4">
            <h2 className={sectionTitle}>Account</h2>
            {user ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">Signed in as</p>
                  <p className="mt-0.5 truncate text-xs text-stitch-muted">{user.email}</p>
                </div>
                <Button size="sm" variant="outline" className={`h-8 shrink-0 text-xs ${outlineBtn}`} onClick={handleSignOut}>
                  <LogOut className="mr-1.5 h-3.5 w-3.5" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-stitch-muted">
                  Create an account to save your portfolio on this device and sync when you sign in. Demo mode never writes to
                  your real account.
                </p>
                <Button
                  size="sm"
                  className="h-9 bg-stitch-accent text-xs font-semibold text-black hover:bg-stitch-accent/90"
                  onClick={() => navigate("/auth")}
                >
                  Create account
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* About */}
        <section className={cardClass}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-stitch-accent/10 blur-3xl" />
          <div className="relative z-10 space-y-4">
            <div>
              <h2 className={`${sectionTitle} mb-2`}>About</h2>
              <p className="text-sm text-stitch-muted">PositionPilot · v1.0.0</p>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-stitch-border pt-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Product tour</p>
                <p className="mt-0.5 text-xs text-stitch-muted">Replay the first-run walkthrough from the Portfolio tab</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className={`shrink-0 gap-1.5 text-xs ${outlineBtn}`}
                onClick={() => {
                  resetOnboarding();
                  window.location.href = "/";
                }}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Replay tour
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
