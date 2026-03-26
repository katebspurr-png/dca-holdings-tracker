import { useNavigate, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Wallet, Sparkles, TrendingUp, Settings } from "lucide-react";

const TABS: {
  path: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
}[] = [
  { path: "/", label: "Portfolio", icon: Wallet, match: (p) => p === "/" || p.startsWith("/holdings/") },
  { path: "/optimizer", label: "Budget lab", icon: Sparkles, match: (p) => p === "/optimizer" },
  { path: "/progress", label: "Progress", icon: TrendingUp, match: (p) => p === "/progress" },
  { path: "/settings", label: "Settings", icon: Settings, match: (p) => p === "/settings" },
];

export default function BottomTabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-stitch-border bg-stitch-bg/95 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md supports-[backdrop-filter]:bg-stitch-bg/80"
      aria-label="Main navigation"
    >
      <ul className="mx-auto flex h-[88px] max-w-md items-center justify-around px-4 pb-4 pt-2">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.path} className="flex h-full w-full flex-col items-center justify-center">
              <button
                type="button"
                onClick={() => navigate(tab.path)}
                className="flex h-full w-full flex-col items-center justify-center gap-1.5 transition-colors"
              >
                <span
                  className={`h-[3px] w-[28px] shrink-0 rounded-[2px] transition-[background-color,box-shadow,opacity] ${
                    active
                      ? "bg-stitch-accent shadow-[0_0_0_1px_hsl(var(--stitch-accent)/0.22)] dark:shadow-[0_0_12px_hsl(var(--stitch-accent)/0.45)]"
                      : "bg-transparent opacity-0"
                  }`}
                  aria-hidden
                />
                <Icon
                  className={`h-6 w-6 transition-[color,filter] ${
                    active
                      ? "text-stitch-accent dark:drop-shadow-[0_0_6px_hsl(var(--stitch-accent)/0.5)]"
                      : "text-stitch-muted"
                  }`}
                  strokeWidth={active ? 2.25 : 2}
                />
                <span
                  className={`text-[10px] font-mono uppercase tracking-wide ${
                    active ? "font-medium text-stitch-accent" : "font-medium text-stitch-muted"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
