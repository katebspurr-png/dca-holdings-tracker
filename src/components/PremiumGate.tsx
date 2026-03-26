import { Lock, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { type FeatureKey, FEATURE_LABELS } from "@/lib/feature-access";

interface PremiumGateProps {
  feature: FeatureKey;
  /** Override title from FEATURE_LABELS */
  title?: string;
  /** Override description from FEATURE_LABELS */
  description?: string;
  /** Render children behind the gate (visible but locked) */
  children?: React.ReactNode;
  className?: string;
}

export default function PremiumGate({ feature, title, description, children, className = "" }: PremiumGateProps) {
  const navigate = useNavigate();
  const info = FEATURE_LABELS[feature];
  const displayTitle = title ?? info.title;
  const displayDesc = description ?? info.description;

  return (
    <div className={`relative ${className}`}>
      {children && (
        <div className="pointer-events-none select-none blur-[1px] opacity-20" aria-hidden>
          {children}
        </div>
      )}

      <div className={`${children ? "absolute inset-0 flex items-center justify-center" : ""}`}>
        <div className="mx-auto max-w-sm rounded-2xl border border-stitch-accent/25 bg-stitch-card p-5 text-center shadow-lg sm:p-6">
          <div className="mb-3 flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stitch-accent/15">
              <Lock className="h-4 w-4 text-stitch-accent" />
            </div>
          </div>
          <h3 className="mb-1 text-sm font-semibold text-white">{displayTitle}</h3>
          <p className="mb-4 text-xs leading-relaxed text-stitch-muted">{displayDesc}</p>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-stitch-accent px-4 text-xs font-semibold text-black hover:bg-stitch-accent/90"
            onClick={() => navigate("/settings")}
          >
            <Crown className="h-3.5 w-3.5" />
            Open Settings for premium preview
          </Button>
          <p className="mt-2 text-[10px] text-stitch-muted/60">
            Enable the premium preview toggle there — no payment until billing is connected.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Inline badge for premium features in lists/tabs */
export function PremiumBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded bg-stitch-accent/15 px-1.5 py-0.5 text-[9px] font-semibold text-stitch-accent ${className}`}
    >
      <Crown className="h-2.5 w-2.5" /> PRO
    </span>
  );
}
