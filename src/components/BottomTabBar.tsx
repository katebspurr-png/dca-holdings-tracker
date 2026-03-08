import { useNavigate, useLocation } from "react-router-dom";
import { Briefcase, Layers, Sparkles, Settings, TrendingDown } from "lucide-react";

const TABS = [
  { path: "/", label: "Holdings", icon: Briefcase, match: (p: string) => p === "/" },
  { path: "/what-if", label: "Scenarios", icon: Layers, match: (p: string) => p === "/what-if" || p === "/scenarios" || p.startsWith("/scenarios/") },
  { path: "/optimizer", label: "Optimizer", icon: Sparkles, match: (p: string) => p === "/optimizer" },
  { path: "/settings", label: "Settings", icon: Settings, match: (p: string) => p === "/settings" },
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
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
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
