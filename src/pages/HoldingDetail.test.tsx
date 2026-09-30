import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HoldingDetail from "./HoldingDetail";
import { SimFeesProvider } from "@/contexts/SimFeesContext";

const mockHolding = {
  id: "test-holding-1",
  ticker: "AAPL",
  exchange: "US",
  shares: 10,
  avg_cost: 150,
  initial_avg_cost: 150,
  current_price: 140,
  fee: 0,
  fee_type: "flat",
  fee_value: 0,
  created_at: "2024-01-01T00:00:00Z",
};

vi.mock("@/lib/storage", () => ({
  getHolding: vi.fn((id: string) => (id === "test-holding-1" ? mockHolding : undefined)),
  getScenariosForHolding: vi.fn(() => []),
  getTransactionsForHolding: vi.fn(() => []),
  undoLastBuy: vi.fn(),
  currencyPrefix: () => "$",
  exchangeLabel: () => "NASDAQ",
  apiTicker: (ticker: string) => ticker,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({ isDemoMode: false }),
}));

vi.mock("@/hooks/use-storage-revision", () => ({
  useStorageRevision: () => 1,
}));

vi.mock("@/hooks/use-pre-auth-save-upsell", () => ({
  usePreAuthSaveUpsell: () => ({
    requestPersist: (cb: () => void) => cb(),
    preAuthUpsellDialog: null,
  }),
}));

vi.mock("@/lib/stock-price", () => ({
  getCachedQuote: () => null,
  fetchStockPrice: vi.fn().mockResolvedValue({ ok: true, quote: { price: 145 } }),
}));

vi.mock("@/lib/pro", () => ({
  canLookup: () => true,
}));

vi.mock("@/lib/feature-access", () => ({
  canSaveScenario: () => true,
  scenariosRemaining: () => 5,
  hasFeature: () => true,
  FREE_SCENARIO_LIMIT: 5,
}));

describe("HoldingDetail tab bar accessibility", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SimFeesProvider>
          <MemoryRouter initialEntries={["/holding/test-holding-1"]}>
            <Routes>
              <Route path="/holding/:id" element={<HoldingDetail />} />
            </Routes>
          </MemoryRouter>
        </SimFeesProvider>
      </QueryClientProvider>
    );
  };

  it("renders workspace tablist with tab roles and accessibility attributes", () => {
    renderComponent();

    const tabList = screen.getByRole("tablist", { name: "Holding workspace tabs" });
    expect(tabList).toBeInTheDocument();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(5);

    // Default tab is Plan ("strategy")
    const planTab = screen.getByRole("tab", { name: /Plan/i });
    expect(planTab).toHaveAttribute("aria-selected", "true");
    expect(planTab).toHaveAttribute("aria-controls", "workspace-tabpanel-strategy");

    const overviewTab = screen.getByRole("tab", { name: /Overview/i });
    expect(overviewTab).toHaveAttribute("aria-selected", "false");
    expect(overviewTab).toHaveAttribute("aria-controls", "workspace-tabpanel-overview");
  });

  it("switches tabs and updates tabpanel aria attributes on tab click", () => {
    renderComponent();

    const overviewTab = screen.getByRole("tab", { name: /Overview/i });
    fireEvent.click(overviewTab);

    expect(overviewTab).toHaveAttribute("aria-selected", "true");
    const tabPanel = screen.getByRole("tabpanel");
    expect(tabPanel).toHaveAttribute("id", "workspace-tabpanel-overview");
    expect(tabPanel).toHaveAttribute("aria-labelledby", "workspace-tab-overview");
  });

  it("renders back button with accessible aria-label", () => {
    renderComponent();

    const backBtn = screen.getByRole("button", { name: "Back to holdings" });
    expect(backBtn).toBeInTheDocument();
  });
});
