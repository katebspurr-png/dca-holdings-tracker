import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

function recoveryFromHash(): boolean {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return hashParams.get("type") === "recovery";
}

export default function AuthResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [canReset, setCanReset] = useState(() => recoveryFromHash());
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setCanReset(true);
      }
    });

    const timeout = window.setTimeout(() => {
      setBootstrapped(true);
    }, 4000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!bootstrapped || canReset) return;
    toast.error("This reset link is invalid or expired.");
    navigate("/auth", { replace: true });
  }, [bootstrapped, canReset, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "h-10 border-stitch-border bg-stitch-pill text-white placeholder:text-stitch-muted/50 focus-visible:ring-stitch-accent";

  if (!canReset) {
    return (
      <div className="flex min-h-[max(884px,100dvh)] flex-col items-center justify-center bg-stitch-bg px-6">
        <Loader2 className="h-8 w-8 animate-spin text-stitch-accent" />
        <p className="mt-4 text-sm text-stitch-muted">Verifying reset link…</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[max(884px,100dvh)] flex-col items-center justify-center bg-stitch-bg px-6 font-sans text-white antialiased">
      <div className="mb-10 text-center">
        <div className="leading-none">
          <span className="font-[family-name:var(--font-heading)] text-[2rem] font-extrabold tracking-tight">
            Position<span className="text-stitch-accent">Pilot</span>
          </span>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-5 rounded-[32px] border border-stitch-border bg-stitch-card p-6 shadow-lg">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">Choose a new password</h1>
          <p className="mt-0.5 text-sm text-stitch-muted">Enter it twice so we know it's right.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs font-medium uppercase tracking-wider text-stitch-muted">
              New password
            </Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs font-medium uppercase tracking-wider text-stitch-muted">
              Confirm password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Repeat password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className={fieldClass}
            />
          </div>

          <Button
            type="submit"
            className="h-10 w-full bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Update password
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-stitch-muted">
          <Link to="/auth" className="font-medium text-stitch-accent hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
