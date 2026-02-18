import { useEffect, useState } from "react";
import themeIcon from "@/assets/theme-toggle.png";

export default function ThemeToggle() {
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

  return (
    <button
      onClick={() => setDark((d) => !d)}
      aria-label="Toggle dark mode"
      className="fixed bottom-5 left-5 z-[100] flex h-11 w-11 items-center justify-center rounded-full bg-card border border-border shadow-lg transition-transform hover:scale-110"
    >
      <img
        src={themeIcon}
        alt="Toggle theme"
        className={`h-6 w-6 transition-transform ${dark ? "rotate-180" : ""}`}
        style={{ filter: dark ? "invert(1)" : "none" }}
      />
    </button>
  );
}
