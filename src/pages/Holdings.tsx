import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Calculator } from "lucide-react";
import type { FeeType } from "@/lib/supabase-holdings";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import HoldingFormDialog from "@/components/HoldingFormDialog";
import {
  fetchHoldings,
  createHolding,
  updateHolding,
  deleteHolding,
  type Holding,
} from "@/lib/supabase-holdings";
import { toast } from "sonner";

export default function Holdings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);
  const [deleting, setDeleting] = useState<Holding | null>(null);

  const { data: holdings = [], isLoading } = useQuery({
    queryKey: ["holdings"],
    queryFn: fetchHoldings,
  });

  const createMut = useMutation({
    mutationFn: (h: Omit<Holding, "id" | "created_at">) => createHolding(h),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      setFormOpen(false);
      toast.success("Holding added");
    },
    onError: () => toast.error("Failed to add holding"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...rest }: { id: string; ticker: string; shares: number; avg_cost: number; fee: number; fee_type: FeeType; fee_value: number }) =>
      updateHolding(id, rest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      setEditing(null);
      toast.success("Holding updated");
    },
    onError: () => toast.error("Failed to update holding"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteHolding(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      setDeleting(null);
      toast.success("Holding deleted");
    },
    onError: () => toast.error("Failed to delete holding"),
  });

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight">
            DCA Down
          </h1>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Holding
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {isLoading ? (
          <p className="text-muted-foreground text-center py-20">Loading…</p>
        ) : holdings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground mb-4">No holdings yet.</p>
            <Button onClick={() => setFormOpen(true)} variant="outline" size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add your first holding
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Ticker</TableHead>
                  <TableHead className="font-semibold text-right">Shares</TableHead>
                  <TableHead className="font-semibold text-right">Avg Cost</TableHead>
                  <TableHead className="font-semibold text-right">Fee</TableHead>
                  <TableHead className="text-right w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <button
                        onClick={() => navigate(`/holdings/${h.id}`)}
                        className="font-mono font-semibold text-primary underline underline-offset-2 hover:opacity-80"
                      >
                        {h.ticker}
                      </button>
                    </TableCell>
                    <TableCell className="text-right font-mono">{fmt(h.shares)}</TableCell>
                    <TableCell className="text-right font-mono">${fmt(h.avg_cost)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {(h as any).fee_type === "percent"
                        ? `${Number((h as any).fee_value).toFixed(2)}%`
                        : `$${Number((h as any).fee_value ?? h.fee).toFixed(2)}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditing(h); setFormOpen(true); }}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleting(h)}
                          aria-label="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/holdings/${h.id}/dca`)}
                        >
                          <Calculator className="mr-1 h-4 w-4" />
                          DCA
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      <HoldingFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        initial={editing}
        loading={createMut.isPending || updateMut.isPending}
        onSubmit={(data) => {
          if (editing) {
            updateMut.mutate({ id: editing.id, ...data });
          } else {
            createMut.mutate(data);
          }
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.ticker}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
