import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CapitalOptimizer from "./CapitalOptimizer";

vi.mock("@/lib/feature-access", () => ({
  hasFeature: vi.fn(() => true),
}));

vi.mock("@/lib/storage", () => ({
  getHoldings: vi.fn(() => [
    {
      id: "1",
      ticker: "AAPL",
      exchange: "US",
      shares: 10,
      avg_cost: 150,
      initial_avg_cost: 150,
      fee: 0,
      fee_type: "flat",
      fee_value: 0,
      created_at: "2024-01-01T00:00:00Z",
    },
  ]),
  currencyPrefix: (ex: string) => (ex === "TSX" ? "CA$" : "$"),
}));

vi.mock("@/lib/price-cache", () => ({
  getCachedPrice: vi.fn(() => 140),
}));

vi.mock("@/contexts/SimFeesContext", () => ({
  useSimFees: vi.fn(() => ({
    includeFees: true,
    setIncludeFees: vi.fn(),
  })),
}));

vi.mock("@/hooks/use-storage-revision", () => ({
  useStorageRevision: vi.fn(() => 0),
}));

describe("CapitalOptimizer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders heading and budget model controls correctly", () => {
    render(
      <MemoryRouter>
        <CapitalOptimizer />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /budget lab/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /model allocation/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reload cache/i })).toBeInTheDocument();
  });

  it("applies accessibility and tactile focus classes to buttons and links", () => {
    render(
      <MemoryRouter>
        <CapitalOptimizer />
      </MemoryRouter>
    );

    const modelBtn = screen.getByRole("button", { name: /model allocation/i });
    expect(modelBtn).toHaveClass("focus-visible:ring-2");
    expect(modelBtn).toHaveClass("active:scale-95");

    const reloadBtn = screen.getByRole("button", { name: /reload cache/i });
    expect(reloadBtn).toHaveClass("focus-visible:ring-2");
    expect(reloadBtn).toHaveClass("active:scale-95");
  });
});
