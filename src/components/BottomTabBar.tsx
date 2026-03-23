import { useNavigate, useLocation } from "react-router-dom";
import { Briefcase, Layers, Sparkles, Settings, TrendingDown, Lock } from "lucide-react";
import { hasFeature } from "@/lib/feature-access";

const TABS = [
  { path: "/", label: "Holdings", icon: Briefcase, match: (p: string) => p === "/", premiumFeature: null },
  { path: "/what-if", label: "Scenarios", icon: Layers, match: (p: string) => p === "/what-if" || p === "/scenarios" || p.startsWith("/scenarios/"), premiumFeature: null },
  { path: "/planner", label: "Planner", icon: Sparkles, match: (p: string) => p === "/planner", premiumFeature: "planner" as const },
  { path: "/settings", label: "Settings", icon: Settings, match: (p: string) => p === "/settings", premiumFeature: null },
] as const;

export default function BottomTabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-4xl items-stretch">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          const locked = tab.premiumFeature && !hasFeature(tab.premiumFeature);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors relative ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                {locked && (
                  <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1.5 text-primary" />
                )}
              </div>
              <span className={`text-[10px] leading-tight ${active ? "font-semibold" : "font-medium"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
