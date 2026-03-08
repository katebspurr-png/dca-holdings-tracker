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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Holding, FeeType, Exchange } from "@/lib/storage";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { ticker: string; exchange: Exchange; shares: number; avg_cost: number; fee: number; fee_type: FeeType; fee_value: number; initial_avg_cost?: number }) => void;
  initial?: Holding | null;
  loading?: boolean;
};

export default function HoldingFormDialog({ open, onOpenChange, onSubmit, initial, loading }: Props) {
  const [ticker, setTicker] = useState("");
  const [exchange, setExchange] = useState<Exchange>("US");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [feeType, setFeeType] = useState<FeeType>("flat");
  const [feeValue, setFeeValue] = useState("0");

  useEffect(() => {
    if (initial) {
      setTicker(initial.ticker);
      setExchange(initial.exchange ?? "US");
      setShares(String(initial.shares));
      setAvgCost(String(initial.avg_cost));
      setFeeType((initial.fee_type as FeeType) || "flat");
      setFeeValue(String(initial.fee_value ?? initial.fee ?? 0));
    } else {
      setTicker("");
      setExchange("US");
      setShares("");
      setAvgCost("");
      setFeeType("flat");
      setFeeValue("0");
    }
  }, [initial, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fv = Number(feeValue);
    onSubmit({
      ticker: ticker.toUpperCase().trim(),
      exchange,
      shares: Number(shares),
      avg_cost: Number(avgCost),
      fee: feeType === "flat" ? fv : 0,
      fee_type: feeType,
      fee_value: fv,
    });
  };

  const currSymbol = exchange === "TSX" ? "C$" : "$";

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
            <div className="flex gap-2">
              <Input
                id="ticker"
                placeholder={exchange === "TSX" ? "SHOP" : "AAPL"}
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                required
                className="font-mono uppercase flex-1"
              />
              <Select value={exchange} onValueChange={(v) => setExchange(v as Exchange)}>
                <SelectTrigger className="w-24 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="US">US</SelectItem>
                  <SelectItem value="TSX">TSX</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              <Label htmlFor="avg_cost">Avg Cost ({currSymbol})</Label>
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

          {/* Fee type + value */}
          <div className="space-y-2">
            <Label>Trading fee type</Label>
            <Select value={feeType} onValueChange={(v) => setFeeType(v as FeeType)}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="flat">Flat fee ({currSymbol})</SelectItem>
                <SelectItem value="percent">Percentage (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee_value">Trading fee value</Label>
            <div className="relative">
              {feeType === "flat" && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currSymbol}</span>
              )}
              <Input
                id="fee_value"
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={feeValue}
                onChange={(e) => setFeeValue(e.target.value)}
                className={feeType === "flat" ? "pl-9" : "pr-7"}
              />
              {feeType === "percent" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              )}
            </div>
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
