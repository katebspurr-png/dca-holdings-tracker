import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchHolding } from "@/lib/supabase-holdings";

export default function DcaCalculator() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: holding, isLoading } = useQuery({
    queryKey: ["holding", id],
    queryFn: () => fetchHolding(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!holding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Holding not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-5">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            DCA Calculator — <span className="text-primary font-mono">{holding.ticker}</span>
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Shares</p>
              <p className="text-lg font-mono font-semibold">{holding.shares}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Cost</p>
              <p className="text-lg font-mono font-semibold">${Number(holding.avg_cost).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Fee</p>
              <p className="text-lg font-mono font-semibold">${Number(holding.fee).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Cost</p>
              <p className="text-lg font-mono font-semibold">
                ${(Number(holding.shares) * Number(holding.avg_cost) + Number(holding.fee)).toFixed(2)}
              </p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            DCA calculator functionality coming soon. You'll be able to simulate buying more shares at a lower price to see your new average cost.
          </p>
        </div>
      </main>
    </div>
  );
}
