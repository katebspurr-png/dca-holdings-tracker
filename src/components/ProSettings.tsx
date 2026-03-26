import { useState } from "react";
import { Settings, Crown, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { isPro, setPro, lookupsRemaining, FREE_LIMIT } from "@/lib/pro";

interface Props {
  onChanged?: () => void;
}

export default function ProSettings({ onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [, setTick] = useState(0);

  const pro = isPro();
  const remaining = lookupsRemaining();

  const handleUpgrade = () => {
    setPro(true);
    setTick((t) => t + 1);
    onChanged?.();
  };

  const handleRestore = () => {
    setPro(true);
    setTick((t) => t + 1);
    onChanged?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Settings"
          className="text-stitch-muted hover:bg-stitch-pill/50 hover:text-white"
        >
          {pro ? <Crown className="h-4 w-4 text-yellow-500" /> : <Settings className="h-4 w-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="border-stitch-border bg-stitch-card text-white sm:max-w-sm sm:rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            {pro && <Crown className="h-5 w-5 text-stitch-accent" />}
            {pro ? "Pro Plan" : "Free Plan"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {pro ? (
            <div className="rounded-lg border border-stitch-border bg-stitch-pill/40 p-4 text-center">
              <p className="text-sm font-medium text-white">
                You&apos;re on the <span className="font-semibold text-stitch-accent">Pro</span> plan
              </p>
              <p className="mt-1 text-xs text-stitch-muted">Unlimited price lookups</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-stitch-border bg-stitch-pill/40 p-4">
                <p className="text-sm font-medium text-white">Free Plan</p>
                <p className="mt-1 text-xs text-stitch-muted">
                  {remaining} of {FREE_LIMIT} price lookups remaining today
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stitch-pill">
                  <div
                    className="h-full rounded-full bg-stitch-accent transition-all"
                    style={{ width: `${(remaining / FREE_LIMIT) * 100}%` }}
                  />
                </div>
              </div>

              <Button
                onClick={handleUpgrade}
                className="w-full bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
                size="sm"
              >
                <Crown className="mr-1.5 h-4 w-4" />
                Upgrade to Pro — $3.99
              </Button>

              <Button
                onClick={handleRestore}
                variant="outline"
                className="w-full border-stitch-border bg-transparent text-white hover:bg-stitch-pill"
                size="sm"
              >
                <RotateCw className="mr-1.5 h-4 w-4" />
                Restore Purchase
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
