import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoMode } from "@/contexts/DemoModeContext";

/**
 * Allows app routes when the user is signed in OR demo mode is active (pre-auth sandbox).
 */
export default function DemoOrAuthRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { isDemoMode } = useDemoMode();

  if (loading) {
    return (
      <div className="flex min-h-[max(884px,100dvh)] items-center justify-center bg-stitch-bg">
        <Loader2 className="h-6 w-6 animate-spin text-stitch-accent" />
      </div>
    );
  }

  if (session || isDemoMode) {
    return <>{children}</>;
  }

  return <Navigate to="/auth" replace />;
}
