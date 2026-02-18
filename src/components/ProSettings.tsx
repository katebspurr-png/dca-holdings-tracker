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
  const [tick, setTick] = useState(0);

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
        <Button size="sm" variant="ghost" aria-label="Settings">
          {pro ? <Crown className="h-4 w-4 text-yellow-500" /> : <Settings className="h-4 w-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {pro && <Crown className="h-5 w-5 text-primary" />}
            {pro ? "Pro Plan" : "Free Plan"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {pro ? (
            <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
              <p className="text-sm font-medium">You're on the <span className="text-primary font-semibold">Pro</span> plan</p>
              <p className="text-xs text-muted-foreground mt-1">Unlimited price lookups</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm font-medium">Free Plan</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {remaining} of {FREE_LIMIT} price lookups remaining today
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(remaining / FREE_LIMIT) * 100}%` }}
                  />
                </div>
              </div>

              <Button onClick={handleUpgrade} className="w-full" size="sm">
                <Crown className="mr-1.5 h-4 w-4" />
                Upgrade to Pro — $3.99
              </Button>

              <Button onClick={handleRestore} variant="outline" className="w-full" size="sm">
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
