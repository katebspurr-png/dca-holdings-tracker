/**
 * Copy for the first-run product tour. Tone: planning, scenario math, visibility —
 * not financial advice, picks, or recommendations.
 */
export type ProductTourPreviewId =
  | "welcome"
  | "portfolio"
  | "strategyOptimizer"
  | "whatIf"
  | "holdingWorkspace"
  | "progress"
  | "finish";

export type ProductTourStep = {
  id: ProductTourPreviewId;
  title: string;
  body: string;
  /** Show shortened educational disclaimer below the card (welcome + finish only). */
  showDisclaimer?: boolean;
};

export const PRODUCT_TOUR_STEPS: ProductTourStep[] = [
  {
    id: "welcome",
    title: "Welcome to PositionPilot",
    body: "Model and compare DCA-style decisions across your holdings—tracking, planning, and scenario math in one place. Nothing here tells you what to trade; it’s a personal planning workspace.",
    showDisclaimer: true,
  },
  {
    id: "portfolio",
    title: "Portfolio",
    body: "See your portfolio in one place: positions, allocations, averages, and context at a glance. Open the ⋯ menu for more tools.",
  },
  {
    id: "strategyOptimizer",
    title: "Scenario results & Budget lab",
    body: "On Portfolio, Scenario results (per holding) lists one modeled step per ticker in A–Z order — not ranked across positions. The Budget lab tab lets you compare how a hypothetical budget might split using fixed rules (illustrative only). Premium preview may unlock extra tools in Settings.",
  },
  {
    id: "whatIf",
    title: "What-If Scenarios",
    body: "From the portfolio ⋯ menu, open What-If Scenarios to line up different contribution ideas and compare outcomes before you change anything in tracking.",
  },
  {
    id: "holdingWorkspace",
    title: "Holding workspace",
    body: "Tap any holding for its workspace: run buy simulations with the DCA tools, then optionally apply a result to your tracked position—always your choice, like updating a spreadsheet.",
  },
  {
    id: "progress",
    title: "Progress",
    body: "Use the Progress tab to see how averages and portfolio-wide metrics evolve against the snapshot from when each holding was first added—visibility and momentum, not performance promises.",
  },
  {
    id: "finish",
    title: "You’re set",
    body: "Explore at your own pace. PositionPilot is for your personal planning only—it doesn’t recommend securities.",
    showDisclaimer: true,
  },
];
