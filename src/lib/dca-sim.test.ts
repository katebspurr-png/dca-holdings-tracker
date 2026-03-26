import { describe, it, expect } from "vitest";
import {
  computeDcaRow,
  buildLadderRows,
  selectMostEfficientLadderStep,
  computeStandardizedEfficiencyScore,
  greedyAllocateBudget,
  LADDER_INVESTMENT_STEPS,
  STANDARD_TEST_INVESTMENT,
} from "./dca-sim";
import type { Holding } from "./storage";

function h(partial: Partial<Holding> & Pick<Holding, "id" | "ticker">): Holding {
  return {
    exchange: "US",
    shares: 10,
    avg_cost: 100,
    initial_avg_cost: 100,
    fee: 0,
    fee_type: "flat",
    fee_value: 0,
    created_at: "2024-01-01T00:00:00Z",
    ...partial,
  };
}

describe("computeDcaRow", () => {
  it("computes new average for underwater buy without fees", () => {
    const row = computeDcaRow(10, 100, 80, 500);
    expect(row).not.toBeNull();
    expect(row!.sharesBought).toBeCloseTo(6.25, 4);
    expect(row!.newAvg).toBeCloseTo(92.307692, 3);
    expect(row!.avgImprovement).toBeCloseTo(7.692308, 3);
    expect(row!.improvementPerDollar).toBeCloseTo(row!.avgImprovement / 500, 8);
  });

  it("returns null for non-positive price or budget", () => {
    expect(computeDcaRow(10, 100, 0, 500)).toBeNull();
    expect(computeDcaRow(10, 100, 80, 0)).toBeNull();
  });

  it("reduces stock budget for percent fee when included", () => {
    const row = computeDcaRow(10, 100, 80, 500, {
      includeFees: true,
      feeType: "percent",
      feeValue: 1,
    });
    expect(row).not.toBeNull();
    const budgetForStock = 500 / 1.01;
    expect(row!.sharesBought).toBeCloseTo(budgetForStock / 80, 5);
  });

  it("subtracts flat fee from stock budget when included", () => {
    const row = computeDcaRow(10, 100, 80, 500, {
      includeFees: true,
      feeType: "flat",
      feeValue: 5,
    });
    expect(row).not.toBeNull();
    expect(row!.sharesBought).toBeCloseTo(495 / 80, 5);
  });
});

describe("buildLadderRows", () => {
  it("returns one row per ladder amount", () => {
    const rows = buildLadderRows(10, 100, 80);
    expect(rows).toHaveLength(LADDER_INVESTMENT_STEPS.length);
    expect(rows.map((r) => r.amount)).toEqual([...LADDER_INVESTMENT_STEPS]);
  });
});

describe("selectMostEfficientLadderStep", () => {
  it("returns null when price >= avg", () => {
    expect(selectMostEfficientLadderStep(10, 100, 100)).toBeNull();
    expect(selectMostEfficientLadderStep(10, 100, 110)).toBeNull();
  });

  it("picks highest improvementPerDollar among non-overkill steps when position is large enough", () => {
    const step = selectMostEfficientLadderStep(1000, 100, 80);
    expect(step).not.toBeNull();
    const rows = buildLadderRows(1000, 100, 80);
    const positionValue = 1000 * 80;
    const viable = rows.filter(
      (r) =>
        r.avgImprovement >= 1e-4 &&
        (positionValue <= 0 || r.amount <= 0.5 * positionValue)
    );
    const best = viable.reduce((a, b) => (a.improvementPerDollar > b.improvementPerDollar ? a : b));
    expect(step!.amount).toBe(best.amount);
    expect(step!.improvementPerDollar).toBeCloseTo(best.improvementPerDollar, 8);
  });

  it("falls back when all rungs are overkill for a tiny position", () => {
    const step = selectMostEfficientLadderStep(1, 100, 50);
    expect(step).not.toBeNull();
    expect(LADDER_INVESTMENT_STEPS.includes(step!.amount as (typeof LADDER_INVESTMENT_STEPS)[number])).toBe(true);
  });
});

describe("computeStandardizedEfficiencyScore", () => {
  it("returns 0 when price >= avg", () => {
    expect(computeStandardizedEfficiencyScore(10, 100, 100).score).toBe(0);
    expect(computeStandardizedEfficiencyScore(10, 100, 100).improvement).toBe(0);
  });

  it("caps score at 100", () => {
    const { score } = computeStandardizedEfficiencyScore(1, 5, 0.01, { testAmount: STANDARD_TEST_INVESTMENT });
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("matches round(10000 * improvement / avg) for a moderate case", () => {
    const { score, improvement } = computeStandardizedEfficiencyScore(10, 100, 80, {
      testAmount: STANDARD_TEST_INVESTMENT,
    });
    const row = computeDcaRow(10, 100, 80, STANDARD_TEST_INVESTMENT);
    expect(improvement).toBeCloseTo(row!.avgImprovement, 6);
    const expected = Math.max(0, Math.min(100, Math.round((improvement / 100) * 10_000)));
    expect(score).toBe(expected);
  });
});

describe("greedyAllocateBudget", () => {
  it("allocates nothing with zero budget", () => {
    const out = greedyAllocateBudget([], {}, 0, false);
    expect(out.lines).toEqual([]);
    expect(out.usedBudget).toBe(0);
  });

  it("sends each chunk to the more efficient underwater holding", () => {
    const a = h({ id: "a", ticker: "AAA", shares: 100, avg_cost: 100 });
    const b = h({ id: "b", ticker: "BBB", shares: 100, avg_cost: 100 });
    const prices = { a: 90, b: 95 };
    const out = greedyAllocateBudget([a, b], prices, 200, false, { chunk: 100 });
    expect(out.usedBudget).toBe(200);
    const byId = Object.fromEntries(out.lines.map((l) => [l.holdingId, l.allocated]));
    expect(byId["a"]).toBe(200);
    expect(byId["b"]).toBeUndefined();
  });
});
