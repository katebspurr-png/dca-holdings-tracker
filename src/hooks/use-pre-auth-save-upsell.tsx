import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoMode } from "@/contexts/DemoModeContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { hasSeenPreAuthSaveUpsell, markPreAuthSaveUpsellSeen } from "@/lib/preAuthDemoUpsell";

/**
 * First persistent action in guest demo shows an upsell; "Continue in demo" marks seen and runs the write.
 */
export function usePreAuthSaveUpsell() {
  const { session } = useAuth();
  const { isDemoMode } = useDemoMode();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  const requestPersist = useCallback(
    (run: () => void) => {
      if (!isDemoMode || session) {
        run();
        return;
      }
      if (hasSeenPreAuthSaveUpsell()) {
        run();
        return;
      }
      pending.current = run;
      setOpen(true);
    },
    [isDemoMode, session],
  );

  const handleContinueDemo = useCallback(() => {
    markPreAuthSaveUpsellSeen();
    setOpen(false);
    const fn = pending.current;
    pending.current = null;
    fn?.();
  }, []);

  const handleCreateAccount = useCallback(() => {
    setOpen(false);
    pending.current = null;
    navigate("/auth?mode=signup");
  }, [navigate]);

  const dialog = (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) pending.current = null;
      }}
    >
      <AlertDialogContent className="border-stitch-border bg-stitch-card text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Save with your own portfolio?</AlertDialogTitle>
          <AlertDialogDescription className="text-stitch-muted">
            Sign up to keep scenarios and buys with your real tracked positions. In demo mode, changes stay in this
            sample sandbox only.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel
            className="border-stitch-border bg-stitch-pill text-white hover:bg-stitch-card hover:text-white"
            onClick={() => {
              setOpen(false);
              pending.current = null;
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-stitch-pill text-white hover:bg-stitch-card"
            onClick={(e) => {
              e.preventDefault();
              handleContinueDemo();
            }}
          >
            Continue in demo
          </AlertDialogAction>
          <AlertDialogAction
            className="bg-stitch-accent text-black hover:bg-stitch-accent/90"
            onClick={(e) => {
              e.preventDefault();
              handleCreateAccount();
            }}
          >
            Create account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { requestPersist, preAuthUpsellDialog: dialog };
}
