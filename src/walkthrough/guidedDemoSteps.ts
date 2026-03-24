/**
 * Non-blocking guided hints for beginner + demo mode. Copy is neutral (no advice).
 */
export type GuidedDemoStep = {
  id: string;
  title: string;
  body: string;
};

export const GUIDED_DEMO_STEPS: GuidedDemoStep[] = [
  {
    id: "calculator",
    title: "Preview a buy",
    body: "Open the Calculator tab on a holding and change amounts to see how a hypothetical buy would affect your tracked average—explore only, not a suggestion to trade.",
  },
  {
    id: "averages",
    title: "See how averages change",
    body: "The result area shows the modeled new average and shares from your inputs. It updates as you adjust numbers.",
  },
  {
    id: "compare",
    title: "Compare another holding",
    body: "Go back to Portfolio and open a different position to run the same kind of preview there.",
  },
  {
    id: "done",
    title: "Keep exploring",
    body: "You can open What-If from the ⋯ menu or save scenarios anytime. Skip this guide whenever you like.",
  },
];
