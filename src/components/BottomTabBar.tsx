import { useNavigate, useLocation } from "react-router-dom";
import { Wallet, Search, Activity, User } from "lucide-react";

const TABS = [
  { path: "/", label: "Portfolio", icon: Wallet, match: (p: string) => p === "/" || p.startsWith("/holdings/") },
  { path: "/update-prices", label: "Search", icon: Search, match: (p: string) => p === "/update-prices" },
  { path: "/what-if", label: "Activity", icon: Activity, match: (p: string) => p === "/what-if" || p === "/scenarios" || p.startsWith("/scenarios/") },
  { path: "/settings", label: "Profile", icon: User, match: (p: string) => p === "/settings" },
] as const;

export default function BottomTabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-stitch-border bg-stitch-card/95 backdrop-blur-md"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
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
                className={`flex h-full w-full flex-col items-center justify-center gap-1 transition-colors ${
                  active ? "text-stitch-accent" : "text-stitch-muted hover:text-stitch-muted-soft"
                }`}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 2} />
                <span className={`text-[10px] ${active ? "font-medium" : "font-medium"}`}>{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
