import { useAuth } from "@/contexts/AuthContext";

/** Shown for signed-in users above the bottom tab bar. */
export default function AppEducationalDisclaimer() {
  const { session } = useAuth();
  if (!session) return null;
  return (
    <p
      className="pointer-events-none fixed bottom-24 left-0 right-0 z-30 mx-auto max-w-lg px-6 text-center text-[9px] leading-snug text-stitch-muted/60 sm:bottom-[5.75rem]"
      role="note"
    >
      PositionPilot models average-cost outcomes from your inputs. It is not financial advice and does not recommend
      securities.
    </p>
  );
}
