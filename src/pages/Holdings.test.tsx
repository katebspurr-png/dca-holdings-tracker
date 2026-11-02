import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Holdings from "./Holdings";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/storage", () => ({
  getHoldings: vi.fn(() => [
    {
      id: "h1",
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
  getScenariosForHolding: vi.fn(() => []),
  getOnboardingDone: vi.fn(() => true),
  isDemoModeSessionActive: vi.fn(() => true),
  currencyPrefix: (ex: string) => (ex === "TSX" ? "C$" : "$"),
  apiTicker: (ticker: string) => ticker,
  addHolding: vi.fn(),
  editHolding: vi.fn(),
  removeHolding: vi.fn(),
}));

vi.mock("@/lib/price-cache", () => ({
  getCachedPrice: vi.fn(() => 175),
}));

vi.mock("@/lib/stock-price", () => ({
  fetchStockPrice: vi.fn(),
}));

vi.mock("@/contexts/SimFeesContext", () => ({
  useSimFees: () => ({ includeFees: false, setIncludeFees: vi.fn() }),
}));

vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({ isDemoMode: true }),
}));

vi.mock("@/hooks/use-refresh-prices", () => ({
  useRefreshPrices: () => ({
    refreshing: false,
    refreshAll: vi.fn(),
    lastRefreshed: Date.now(),
  }),
  formatLastRefreshed: vi.fn(() => "just now"),
}));

vi.mock("@/hooks/use-storage-revision", () => ({
  useStorageRevision: vi.fn(),
}));

describe("Holdings page UX & accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders holding cards and action buttons with accessible labels and attributes", () => {
    render(
      <MemoryRouter>
        <Holdings />
      </MemoryRouter>,
    );

    // Holding card has descriptive accessible label
    const card = screen.getByRole("button", { name: /Holding AAPL, \$175\.00/i });
    expect(card).toBeDefined();

    // Edit button has accessible label
    const editBtn = screen.getByRole("button", { name: "Edit AAPL" });
    expect(editBtn).toBeDefined();

    // Delete button has accessible label
    const deleteBtn = screen.getByRole("button", { name: "Delete AAPL" });
    expect(deleteBtn).toBeDefined();

    // Open plan tab button has accessible label
    const planBtn = screen.getByRole("button", { name: "Open Plan tab for AAPL" });
    expect(planBtn).toBeDefined();

    // Add stock button has accessible label
    const addStockBtn = screen.getByRole("button", { name: "Add new stock position" });
    expect(addStockBtn).toBeDefined();
  });
});
