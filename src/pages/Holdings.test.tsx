import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Holdings from "./Holdings";

const mockHoldings = [
  {
    id: "h1",
    ticker: "AAPL",
    shares: 10,
    avg_cost: 150,
    exchange: "US",
    created_at: "2024-01-01",
    initial_avg_cost: 150,
  },
];

vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return {
    ...actual,
    getHoldings: () => mockHoldings,
    isDemoModeSessionActive: () => true,
    currencyPrefix: () => "$",
    apiTicker: (t: string) => t,
    getScenariosForHolding: () => [],
    addHolding: vi.fn(),
    editHolding: vi.fn(),
    removeHolding: vi.fn(),
  };
});

vi.mock("@/lib/price-cache", () => ({
  getCachedPrice: () => 140, // 140 < 150 avg_cost triggers ladder row
}));

vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({ isDemoMode: false, enterDemo: vi.fn() }),
}));

vi.mock("@/contexts/SimFeesContext", () => ({
  useSimFees: () => ({ includeFees: false, setIncludeFees: vi.fn() }),
}));

vi.mock("@/hooks/use-refresh-prices", () => ({
  useRefreshPrices: () => ({ refreshing: false, refreshAll: vi.fn(), lastRefreshed: null }),
  formatLastRefreshed: () => "",
}));

describe("Holdings page - DcaOpportunities accessibility & UX", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders scenario results section with accessible heading and toggle button", () => {
    render(
      <MemoryRouter>
        <Holdings />
      </MemoryRouter>,
    );

    const toggleButton = screen.getByRole("button", { name: /scenario results \(per holding\)/i });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute("aria-expanded", "true");
    expect(toggleButton).toHaveAttribute("aria-controls", "dca-opportunities-content");

    // Section should be labeled by heading
    const heading = screen.getByRole("heading", { name: /scenario results \(per holding\)/i });
    expect(heading).toHaveAttribute("id", "dca-opportunities-heading");

    // Scenario row button has accessible name
    const scenarioButton = screen.getByRole("button", { name: /open strategy plan for aapl/i });
    expect(scenarioButton).toBeInTheDocument();
  });

  it("toggles section expansion on click and updates aria-expanded", () => {
    render(
      <MemoryRouter>
        <Holdings />
      </MemoryRouter>,
    );

    const toggleButton = screen.getByRole("button", { name: /scenario results \(per holding\)/i });
    expect(toggleButton).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    expect(localStorage.getItem("dca-opportunities-expanded")).toBe("0");

    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute("aria-expanded", "true");
    expect(localStorage.getItem("dca-opportunities-expanded")).toBe("1");
  });
});
