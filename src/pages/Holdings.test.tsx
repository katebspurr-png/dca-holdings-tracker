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
  getScenariosForHolding: vi.fn(() => []),
  addHolding: vi.fn(),
  editHolding: vi.fn(),
  removeHolding: vi.fn(),
  isDemoModeSessionActive: vi.fn(() => true),
  currencyPrefix: (ex: string) => (ex === "TSX" ? "C$" : "$"),
  apiTicker: (ticker: string) => ticker,
}));

vi.mock("@/contexts/SimFeesContext", () => ({
  useSimFees: () => ({ includeFees: false, setIncludeFees: vi.fn() }),
}));

vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({ isDemoMode: false }),
}));

vi.mock("@/hooks/use-refresh-prices", () => ({
  useRefreshPrices: () => ({ refreshing: false, refreshAll: vi.fn(), lastRefreshed: null }),
  formatLastRefreshed: () => "",
}));

vi.mock("@/hooks/use-storage-revision", () => ({
  useStorageRevision: () => 0,
}));

vi.mock("@/lib/price-cache", () => ({
  getCachedPrice: () => 170,
}));

describe("Holdings Page UX & Accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the floating 'Add Stock' CTA button with explicit aria-label", () => {
    render(
      <MemoryRouter>
        <Holdings />
      </MemoryRouter>
    );

    const addStockBtn = screen.getByRole("button", { name: "Add new stock position" });
    expect(addStockBtn).toBeInTheDocument();
    expect(addStockBtn.className).toContain("focus-visible:ring-2");
    expect(addStockBtn.className).toContain("active:scale-95");
  });

  it("renders Grid and List layout view toggle buttons with correct ARIA labels and states", () => {
    render(
      <MemoryRouter>
        <Holdings />
      </MemoryRouter>
    );

    const gridBtn = screen.getByRole("button", { name: "Grid view" });
    const listBtn = screen.getByRole("button", { name: "List view" });

    expect(gridBtn).toBeInTheDocument();
    expect(listBtn).toBeInTheDocument();
    expect(gridBtn).toHaveAttribute("aria-pressed", "true");
    expect(listBtn).toHaveAttribute("aria-pressed", "false");
  });
});
