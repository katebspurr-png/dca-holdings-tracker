import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingDown, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type Mode = "login" | "signup";

export default function Auth() {
  const { session } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in — send to app
  if (session) return <Navigate to="/" replace />;

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
    } catch (err: any) {
      const msg = err?.message ?? "Something went wrong";
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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div style={{ lineHeight: 1 }}>
          <span
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: "2rem",
              letterSpacing: "-0.03em",
            }}
          >
            Position
            <span style={{ color: "hsl(160 60% 52%)" }}>Pilot</span>
          </span>
          <div
            style={{
              fontSize: "0.6rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "hsl(215 16% 45%)",
              marginTop: 4,
            }}
          >
            Strategy Engine
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4 max-w-xs">
          Smart tools for managing your average cost and planning your next move.
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-5 shadow-lg">
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {mode === "login"
              ? "Sign in to access your portfolio."
              : "Start managing your positions smarter."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              className="h-10"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-10 font-semibold"
            disabled={loading}
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

        <div className="border-t border-border pt-4 text-center">
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="ml-1.5 font-medium text-primary hover:underline"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

      {/* Footer note */}
      <p className="mt-8 text-[11px] text-muted-foreground/40 text-center max-w-xs">
        Not financial advice. Always do your own research before investing.
      </p>
    </div>
  );
}
