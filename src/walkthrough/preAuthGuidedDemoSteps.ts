/**
 * Pre-auth demo walkthrough — educational copy only, no recommendations.
 */
export type PreAuthGuidedDemoStep = {
  id: string;
  title: string;
  body: string;
};

export const PRE_AUTH_GUIDED_DEMO_STEPS: PreAuthGuidedDemoStep[] = [
  {
    id: "portfolio",
    title: "Your sample portfolio",
    body: "This list is made-up data so you can tap around safely. It’s for learning how the tools work—not a real account or suggestion to buy anything.",
  },
  {
    id: "metric",
    title: "Average cost at a glance",
    body: "Each row shows what you’ve tracked for shares and average cost. The app uses your numbers to model “what if I bought more?”—math practice, not advice.",
  },
  {
    id: "whatif",
    title: "Compare ideas with What-if",
    body: "Open What-if from the menu to split pretend money across holdings and see how the math changes side by side. You’re exploring scenarios, not picking investments.",
  },
  {
    id: "optimizer",
    title: "Optimizer and next moves",
    body: "The Optimizer tab plays with budgets and fees on this sample set. Think of it as a sandbox for planning, not a recommendation to trade.",
  },
  {
    id: "progress",
    title: "Track progress over time",
    body: "Progress shows how you might follow goals in the app. With your own account, you’d connect this to positions you actually track.",
  },
  {
    id: "done",
    title: "When you’re ready",
    body: "Create an account when you want to save your own portfolio on this device and sync it. Everything here stays in demo until then.",
  },
];
