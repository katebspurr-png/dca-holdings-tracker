import { Lock, Crown } from "lucide-react";
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
  const info = FEATURE_LABELS[feature];
  const displayTitle = title ?? info.title;
  const displayDesc = description ?? info.description;

  return (
    <div className={`relative ${className}`}>
      {/* Blurred/dimmed content behind */}
      {children && (
        <div className="opacity-20 pointer-events-none select-none blur-[1px]" aria-hidden>
          {children}
        </div>
      )}

      {/* Gate overlay / card */}
      <div className={`${children ? "absolute inset-0 flex items-center justify-center" : ""}`}>
        <div className="rounded-xl border border-primary/20 bg-card p-5 sm:p-6 text-center max-w-sm mx-auto shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-4 w-4 text-primary" />
            </div>
          </div>
          <h3 className="text-sm font-semibold mb-1">{displayTitle}</h3>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{displayDesc}</p>
          <Button
            size="sm"
            className="h-8 text-xs px-4 gap-1.5"
            onClick={() => {
              // Future: navigate to upgrade page or open billing
              // For now, just a visual placeholder
            }}
          >
            <Crown className="h-3.5 w-3.5" />
            Upgrade to Premium
          </Button>
          <p className="text-[10px] text-muted-foreground/50 mt-2">Unlock all premium features</p>
        </div>
      </div>
    </div>
  );
}

/** Inline badge for premium features in lists/tabs */
export function PremiumBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5 ${className}`}>
      <Crown className="h-2.5 w-2.5" /> PRO
    </span>
  );
}
