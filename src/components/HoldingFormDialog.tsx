import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Holding } from "@/lib/supabase-holdings";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { ticker: string; shares: number; avg_cost: number; fee: number }) => void;
  initial?: Holding | null;
  loading?: boolean;
};

export default function HoldingFormDialog({ open, onOpenChange, onSubmit, initial, loading }: Props) {
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [fee, setFee] = useState("0");

  useEffect(() => {
    if (initial) {
      setTicker(initial.ticker);
      setShares(String(initial.shares));
      setAvgCost(String(initial.avg_cost));
      setFee(String(initial.fee));
    } else {
      setTicker("");
      setShares("");
      setAvgCost("");
      setFee("0");
    }
  }, [initial, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ticker: ticker.toUpperCase().trim(),
      shares: Number(shares),
      avg_cost: Number(avgCost),
      fee: Number(fee),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {initial ? "Edit Holding" : "Add Holding"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="ticker">Ticker</Label>
            <Input
              id="ticker"
              placeholder="AAPL"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              required
              className="font-mono uppercase"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shares">Shares</Label>
              <Input
                id="shares"
                type="number"
                step="any"
                min="0"
                placeholder="100"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avg_cost">Avg Cost ($)</Label>
              <Input
                id="avg_cost"
                type="number"
                step="any"
                min="0"
                placeholder="150.00"
                value={avgCost}
                onChange={(e) => setAvgCost(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee">Fee ($)</Label>
            <Input
              id="fee"
              type="number"
              step="any"
              min="0"
              placeholder="0"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {initial ? "Save" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
