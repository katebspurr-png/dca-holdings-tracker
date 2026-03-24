import { useNavigate, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Wallet, Sparkles, TrendingUp, Settings } from "lucide-react";

const ACCENT = "#34d399";

const TABS: {
  path: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
}[] = [
  { path: "/", label: "Portfolio", icon: Wallet, match: (p) => p === "/" || p.startsWith("/holdings/") },
  { path: "/optimizer", label: "Planner", icon: Sparkles, match: (p) => p === "/optimizer" },
  { path: "/progress", label: "Progress", icon: TrendingUp, match: (p) => p === "/progress" },
  { path: "/settings", label: "Settings", icon: Settings, match: (p) => p === "/settings" },
];

export default function BottomTabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md"
      style={{
        backgroundColor: "#0d1117",
        borderTop: "1px solid #1e2a1e",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <ul className="mx-auto flex h-[88px] max-w-md items-center justify-around px-4 pb-4">
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
                  className="h-[3px] w-[28px] shrink-0 rounded-[2px] transition-[background-color,box-shadow,opacity]"
                  style={
                    active
                      ? {
                          backgroundColor: ACCENT,
                          boxShadow: "0 0 6px rgba(52, 211, 153, 0.45)",
                        }
                      : { backgroundColor: "transparent", opacity: 0 }
                  }
                  aria-hidden
                />
                <Icon
                  className="h-6 w-6"
                  strokeWidth={active ? 2.25 : 2}
                  style={
                    active
                      ? { color: ACCENT, filter: "drop-shadow(0 0 4px #34d399)" }
                      : { color: "#8b949e" }
                  }
                />
                <span
                  className={`text-[10px] font-mono uppercase tracking-wide ${
                    active ? "font-medium" : "font-medium"
                  }`}
                  style={{ color: active ? ACCENT : "#8b949e" }}
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
