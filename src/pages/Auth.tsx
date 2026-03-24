import { useState, useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { authCallbackUrl, authResetPasswordUrl } from "@/lib/authRedirectUrls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, Mail } from "lucide-react";
import { toast } from "sonner";

type Mode = "login" | "signup" | "forgot";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function Auth() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  if (session) return <Navigate to="/" replace />;

  useEffect(() => {
    if (searchParams.get("demo") === "true") {
      navigate("/demo", { replace: true });
    }
  }, [searchParams, navigate]);

  const redirectTo = authCallbackUrl();
  const resetRedirectTo = authResetPasswordUrl();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Account created! You're now signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg.includes("Invalid login credentials")) {
        toast.error("Incorrect email or password.");
      } else if (msg.includes("User already registered")) {
        toast.error("An account with this email already exists. Try logging in.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: resetRedirectTo,
      });
      if (error) throw error;
      toast.success("Check your email for a reset link.");
      setMode("login");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      toast.error("Enter your email first.");
      return;
    }
    setMagicLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: mode === "signup",
        },
      });
      if (error) throw error;
      toast.success("Check your email for the sign-in link.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setMagicLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      toast.error("Could not start Google sign-in.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const fieldClass =
    "h-10 border-stitch-border bg-stitch-pill text-white placeholder:text-stitch-muted/50 focus-visible:ring-stitch-accent";

  const title =
    mode === "forgot" ? "Reset password" : mode === "login" ? "Welcome back" : "Create your account";
  const subtitle =
    mode === "forgot"
      ? "We'll email you a link to choose a new password."
      : mode === "login"
        ? "Sign in to access your portfolio."
        : "Start managing your positions smarter.";

  return (
    <div className="relative flex min-h-[max(884px,100dvh)] flex-col items-center justify-center bg-stitch-bg px-6 font-sans text-white antialiased">
      <div className="mb-10 text-center">
        <div className="leading-none">
          <span className="font-[family-name:var(--font-heading)] text-[2rem] font-extrabold tracking-tight">
            Position<span className="text-stitch-accent">Pilot</span>
          </span>
          <div className="mt-1 text-[0.6rem] uppercase tracking-[0.14em] text-stitch-muted">Strategy Engine</div>
        </div>
        <p className="mt-4 max-w-xs text-sm text-stitch-muted">
          Smart tools for managing your average cost and planning your next move.
        </p>
        <div className="mt-6 flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            type="button"
            size="lg"
            className="h-11 w-full bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90 sm:max-w-[200px]"
            onClick={() => navigate("/demo")}
          >
            Try demo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 w-full border-stitch-border bg-stitch-pill font-medium text-white hover:bg-stitch-card hover:text-white sm:max-w-[200px]"
            onClick={() => setMode("signup")}
          >
            Get started
          </Button>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-5 rounded-[32px] border border-stitch-border bg-stitch-card p-6 shadow-lg">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">{title}</h1>
          <p className="mt-0.5 text-sm text-stitch-muted">{subtitle}</p>
        </div>

        {mode !== "forgot" && (
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full border-stitch-border bg-stitch-pill font-medium text-white hover:bg-stitch-pill/80 hover:text-white"
              onClick={handleGoogle}
              disabled={googleLoading || loading || magicLoading}
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <GoogleIcon className="mr-2 h-4 w-4" />
                  Continue with Google
                </>
              )}
            </Button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-stitch-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-stitch-card px-2 text-stitch-muted">or email</span>
              </div>
            </div>
          </>
        )}

        {mode === "forgot" ? (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-stitch-muted">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className={fieldClass}
              />
            </div>
            <Button
              type="submit"
              className="h-10 w-full bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
            </Button>
            <p className="text-center text-sm text-stitch-muted">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="font-medium text-stitch-accent hover:underline"
              >
                Back to sign in
              </button>
            </p>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-stitch-muted">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className={fieldClass}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-stitch-muted">
                    Password
                  </Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs font-medium text-stitch-accent hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  className={fieldClass}
                />
              </div>

              <Button
                type="submit"
                className="h-10 w-full bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
                disabled={loading || googleLoading || magicLoading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {mode === "login" ? "Sign In" : "Create Account"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <Button
              type="button"
              variant="ghost"
              className="h-10 w-full text-stitch-muted hover:bg-stitch-pill hover:text-white"
              onClick={handleMagicLink}
              disabled={magicLoading || loading || googleLoading}
            >
              {magicLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4 text-stitch-accent" />
                  Email me a magic link
                </>
              )}
            </Button>
          </>
        )}

        {mode !== "forgot" && (
          <div className="border-t border-stitch-border pt-4 text-center">
            <p className="text-sm text-stitch-muted">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="ml-1.5 font-medium text-stitch-accent hover:underline"
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        )}
      </div>

      <p className="mt-8 max-w-xs text-center text-[11px] text-stitch-muted/50">
        Not financial advice. Always do your own research before investing.
      </p>
    </div>
  );
}
