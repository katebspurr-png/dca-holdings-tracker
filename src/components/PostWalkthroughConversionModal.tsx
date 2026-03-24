import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useExperience } from "@/contexts/ExperienceContext";

export default function PostWalkthroughConversionModal() {
  const navigate = useNavigate();
  const { postWalkthroughConversionOpen, settlePostWalkthroughConversion } = useExperience();

  const handleOpenChange = (open: boolean) => {
    if (!open) settlePostWalkthroughConversion();
  };

  const handleCreateAccount = () => {
    settlePostWalkthroughConversion();
    navigate("/auth?mode=signup");
  };

  const handleKeepExploring = () => {
    settlePostWalkthroughConversion();
  };

  return (
    <Dialog open={postWalkthroughConversionOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[min(100%,22rem)] gap-4 border-stitch-border bg-stitch-card p-6 text-white sm:max-w-md">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight text-white">
            Ready to try with your own data?
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-stitch-muted">
            You can save a real portfolio on this device and sync when you sign up. Or stay in the sample sandbox as long as
            you like.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            className="h-11 w-full bg-stitch-accent font-semibold text-black hover:bg-stitch-accent/90"
            onClick={handleCreateAccount}
          >
            Create account
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full border-stitch-border bg-stitch-pill text-stitch-muted-soft hover:bg-stitch-card hover:text-white"
            onClick={handleKeepExploring}
          >
            Keep exploring demo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
