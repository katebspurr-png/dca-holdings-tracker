/**
 * Pre-auth demo walkthrough — plain language; math and visualization only, not advice.
 */
export type PreAuthGuidedDemoStep = {
  id: string;
  title: string;
  body: string;
};

export const PRE_AUTH_GUIDED_DEMO_STEPS: PreAuthGuidedDemoStep[] = [
  {
    id: "portfolio",
    title: "You’re on the Portfolio screen",
    body: "This is the first screen after you enter the demo. The list below is made-up sample data so you can tap around without risk. It is not a real account and not a suggestion to buy or sell anything.",
  },
  {
    id: "metric",
    title: "What each row is showing",
    body: "Each row is one stock you’re pretending to track. You’ll see how many shares and your average price per share (a simple average of what you “paid”). The app uses those numbers to run what-if math—for example, if I bought more at this price, how would my average change? That’s calculator-style practice, not advice.",
  },
  {
    id: "whatif",
    title: "The What-If screen",
    body: "Open What-If from the ⋯ menu on the Portfolio tab. There you can split play money across rows and see the numbers side by side. You’re comparing stories on paper, not getting a recommendation on what to do.",
  },
  {
    id: "optimizer",
    title: "The Budget lab screen",
    body: "The Budget lab tab lets you try different dollar amounts and fees on this same sample list. It’s a scratch pad for how the math might look — not a signal to trade or rebalance for real.",
  },
  {
    id: "progress",
    title: "The Progress screen",
    body: "Progress is where you’d watch things change over time as you update your own tracker. In the demo it’s just for show. With a real account, you’d connect it to positions you actually own—still tracking and charts, not tips.",
  },
  {
    id: "done",
    title: "Saving your own data",
    body: "When you’re ready, create an account to save your portfolio on this device and sync it. Everything in demo stays separate. PositionPilot is a math and visualization tool; it does not provide financial advice.",
  },
];
