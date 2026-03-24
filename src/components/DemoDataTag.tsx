import { cn } from "@/lib/utils";

/** Inline label for screens that show portfolio-style titles. */
export function DemoDataTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border border-amber-500/45 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100/95",
        className,
      )}
    >
      Demo data
    </span>
  );
}
