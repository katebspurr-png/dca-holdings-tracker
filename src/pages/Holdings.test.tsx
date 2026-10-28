import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Holdings from "./Holdings";

const mockHoldings = [
  {
    id: "1",
    ticker: "AAPL",
    exchange: "US" as const,
    shares: 10,
    avg_cost: 150,
    initial_avg_cost: 150,
    fee: 0,
    fee_type: "flat" as const,
    fee_value: 0,
    created_at: "2024-01-01T00:00:00Z",
  },
];

vi.mock("@/lib/storage", () => ({
  getHoldings: vi.fn(() => [...mockHoldings]),
  addHolding: vi.fn(),
  editHolding: vi.fn(),
  removeHolding: vi.fn(),
  getScenariosForHolding: vi.fn(() => []),
  isDemoModeSessionActive: vi.fn(() => false),
  currencyPrefix: (ex: string) => (ex === "TSX" ? "C$" : "$"),
  apiTicker: (ticker: string) => ticker,
}));

vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({ isDemoMode: false }),
}));

vi.mock("@/contexts/SimFeesContext", () => ({
  useSimFees: () => ({ includeFees: false, setIncludeFees: vi.fn() }),
}));

vi.mock("@/hooks/use-storage-revision", () => ({
  useStorageRevision: () => 0,
}));

vi.mock("@/hooks/use-refresh-prices", () => ({
  useRefreshPrices: () => ({ refreshing: false, refreshAll: vi.fn(), lastRefreshed: null }),
  formatLastRefreshed: vi.fn(() => ""),
}));

describe("Holdings page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders floating Add Stock button with accessibility attributes and focus ring classes", () => {
    render(
      <MemoryRouter>
        <Holdings />
      </MemoryRouter>
    );

    const addButton = screen.getByRole("button", { name: "Add new stock position" });
    expect(addButton).toBeDefined();
    expect(addButton.className).toContain("focus-visible:ring-2");
    expect(addButton.className).toContain("focus-visible:ring-stitch-accent/50");
    expect(addButton.className).toContain("active:scale-95");
  });
});
