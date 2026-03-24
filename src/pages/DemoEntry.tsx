import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useDemoMode } from "@/contexts/DemoModeContext";

/** Enables demo sandbox and sends the user to the portfolio. Public route. */
export default function DemoEntry() {
  const navigate = useNavigate();
  const { enterDemo } = useDemoMode();

  useEffect(() => {
    enterDemo();
    navigate("/", { replace: true });
    // Intentionally once on mount — enterDemo is stable but we avoid re-navigation loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[max(884px,100dvh)] items-center justify-center bg-stitch-bg">
      <Loader2 className="h-8 w-8 animate-spin text-stitch-accent" />
    </div>
  );
}
