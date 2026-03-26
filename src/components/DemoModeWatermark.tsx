import { useDemoMode } from "@/contexts/DemoModeContext";

/**
 * Fixed, non-interactive layer so demo is visibly distinct from a real portfolio on every tab.
 * Sits above page content (z-12) but below headers (z-20+), tab bar (z-40), banner (z-90), and coach (z-95).
 */
export default function DemoModeWatermark() {
  const { isDemoMode } = useDemoMode();

  if (!isDemoMode) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[12] overflow-hidden"
      aria-hidden
    >
      <div className="flex h-full w-full items-center justify-center">
        <span className="select-none font-[family-name:var(--font-heading)] text-[min(22vw,11rem)] font-extrabold leading-none tracking-tighter text-amber-400/[0.07] sm:text-[min(18vw,14rem)] dark:text-amber-300/[0.08]">
          DEMO
        </span>
      </div>
    </div>
  );
}
