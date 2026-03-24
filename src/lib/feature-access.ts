/**
 * Centralized feature access & plan gating.
 * Plan is read from localStorage (`dca-user-plan`) for **preview only** until App Store / web billing is integrated.
 */

export type PlanType = "free" | "premium";
export type PlanStatus = "active" | "expired";

export type FeatureKey =
  | "basic_holdings"
  | "calculator"
  | "goal_ladder"
  | "manual_price_updates"
  | "position_insights"
  | "basic_scenarios"
  | "scenario_compare"
  | "optimizer"
  | "opportunity_alerts"
  | "auto_price_refresh"
  | "advanced_goal_ladder"
  | "unlimited_scenarios";

const PLAN_FEATURES: Record<PlanType, Set<FeatureKey>> = {
  free: new Set([
    "basic_holdings",
    "calculator",
    "goal_ladder",
    "manual_price_updates",
    "position_insights",
    "basic_scenarios",
  ]),
  premium: new Set([
    "basic_holdings",
    "calculator",
    "goal_ladder",
    "manual_price_updates",
    "position_insights",
    "basic_scenarios",
    "scenario_compare",
    "optimizer",
    "opportunity_alerts",
    "auto_price_refresh",
    "advanced_goal_ladder",
    "unlimited_scenarios",
  ]),
};

export const FEATURE_LABELS: Record<FeatureKey, { title: string; description: string }> = {
  basic_holdings: { title: "Holdings Tracking", description: "Track your stock positions" },
  calculator: { title: "DCA Calculator", description: "Calculate dollar-cost averaging scenarios" },
  goal_ladder: {
    title: "Budget-step simulator",
    description: "Fixed-dollar rungs to model how buys at the current price would change average cost",
  },
  manual_price_updates: { title: "Manual Price Updates", description: "Refresh market prices" },
  position_insights: {
    title: "Position math (Insights)",
    description: "Modeled averages, fixed-size test scores, and what-if capital figures from your inputs",
  },
  basic_scenarios: { title: "Scenario Saving", description: "Save up to 5 scenarios per holding" },
  scenario_compare: { title: "Scenario Compare", description: "Side-by-side comparison of saved scenarios and their modeled outcomes" },
  optimizer: { title: "Capital Optimizer", description: "Simulate how a fixed budget splits across positions and affects average cost (illustrative, not prescriptive)" },
  opportunity_alerts: { title: "Opportunity Alerts", description: "Get notified when a holding drops below key price thresholds" },
  auto_price_refresh: { title: "Auto Price Refresh", description: "Automatic market price updates without manual intervention" },
  advanced_goal_ladder: {
    title: "Custom budget rungs (roadmap)",
    description: "User-defined step sizes and targets — planned for a future release",
  },
  unlimited_scenarios: { title: "Unlimited Scenarios", description: "Save unlimited DCA scenarios per holding" },
};

const PLAN_KEY = "dca-user-plan";

interface UserPlan {
  plan: PlanType;
  plan_status: PlanStatus;
}

function readPlan(): UserPlan {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return { plan: "free", plan_status: "active" };
    const parsed = JSON.parse(raw);
    return {
      plan: parsed.plan === "premium" ? "premium" : "free",
      plan_status: parsed.plan_status === "expired" ? "expired" : "active",
    };
  } catch {
    return { plan: "free", plan_status: "active" };
  }
}

function writePlan(p: UserPlan) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(p));
}

// ── Public API ───────────────────────────────────────────────

export function getUserPlan(): UserPlan {
  return readPlan();
}

export function getActivePlan(): PlanType {
  const p = readPlan();
  if (p.plan_status !== "active") return "free";
  return p.plan;
}

export function setUserPlan(plan: PlanType, status: PlanStatus = "active") {
  writePlan({ plan, plan_status: status });
}

export function hasFeature(feature: FeatureKey): boolean {
  const plan = getActivePlan();
  return PLAN_FEATURES[plan].has(feature);
}

export function isPremium(): boolean {
  return getActivePlan() === "premium";
}

/** Free users: max 5 scenarios per holding */
export const FREE_SCENARIO_LIMIT = 5;

export function canSaveScenario(currentCount: number): boolean {
  if (isPremium()) return true;
  return currentCount < FREE_SCENARIO_LIMIT;
}

export function scenariosRemaining(currentCount: number): number {
  if (isPremium()) return Infinity;
  return Math.max(0, FREE_SCENARIO_LIMIT - currentCount);
}
