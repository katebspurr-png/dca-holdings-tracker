import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const finished = useRef(false);

  useEffect(() => {
    const finish = (path: string) => {
      if (finished.current) return;
      finished.current = true;
      navigate(path, { replace: true });
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish("/");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish("/");
    });

    const timeout = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          toast.error("Sign-in didn't complete. Try again.");
          finish("/auth");
        }
      });
    }, 12000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-[max(884px,100dvh)] items-center justify-center bg-stitch-bg">
      <Loader2 className="h-8 w-8 animate-spin text-stitch-accent" />
    </div>
  );
}
