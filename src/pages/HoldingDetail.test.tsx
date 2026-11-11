import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import HoldingDetail from "./HoldingDetail";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SimFeesProvider } from "@/contexts/SimFeesContext";

vi.mock("@/lib/storage", () => ({
  getHolding: vi.fn().mockImplementation((id: string) => {
    if (id === "holding-1") {
      return {
        id: "holding-1",
        ticker: "AAPL",
        shares: 10,
        avg_cost: 150,
        exchange: "US",
        fee_type: "flat",
        fee_value: 0,
        current_price: 140,
      };
    }
    return undefined;
  }),
  getScenariosForHolding: vi.fn().mockReturnValue([]),
  getTransactionsForHolding: vi.fn().mockReturnValue([]),
  undoLastBuy: vi.fn(),
  removeScenario: vi.fn(),
  currencyPrefix: vi.fn().mockReturnValue("$"),
  exchangeLabel: vi.fn().mockReturnValue("US"),
  apiTicker: vi.fn().mockReturnValue("AAPL"),
  addScenario: vi.fn(),
  applyBuyToHolding: vi.fn(),
  editHolding: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({ isDemoMode: false }),
}));

vi.mock("@/hooks/use-storage-revision", () => ({
  useStorageRevision: () => 0,
}));

vi.mock("@/hooks/use-pre-auth-save-upsell", () => ({
  usePreAuthSaveUpsell: () => ({
    requestPersist: (cb: () => void) => cb(),
    preAuthUpsellDialog: null,
  }),
}));

vi.mock("@/lib/stock-price", () => ({
  getCachedQuote: vi.fn().mockReturnValue(null),
  fetchStockPrice: vi.fn().mockResolvedValue({ ok: false }),
}));

vi.mock("@/lib/pro", () => ({
  canLookup: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/feature-access", () => ({
  canSaveScenario: vi.fn().mockReturnValue(true),
  scenariosRemaining: vi.fn().mockReturnValue(5),
  hasFeature: vi.fn().mockReturnValue(true),
  FREE_SCENARIO_LIMIT: 5,
}));

function renderHoldingDetail(initialPath = "/holding/holding-1") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SimFeesProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/holding/:id" element={<HoldingDetail />} />
            <Route path="/" element={<div>Home Page</div>} />
          </Routes>
        </MemoryRouter>
      </SimFeesProvider>
    </QueryClientProvider>
  );
}

describe("HoldingDetail Header & Navigation UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders accessible back button with aria-label", () => {
    renderHoldingDetail();

    const backButton = screen.getByRole("button", { name: "Back to portfolio overview" });
    expect(backButton).toBeInTheDocument();
  });

  it("renders workspace tablist and accessible tab elements with aria-selected states", () => {
    renderHoldingDetail();

    const tablist = screen.getByRole("tablist", { name: "Position workspace tabs" });
    expect(tablist).toBeInTheDocument();

    const overviewTab = screen.getByRole("tab", { name: "Overview" });
    const planTab = screen.getByRole("tab", { name: "Plan" });
    const calculatorTab = screen.getByRole("tab", { name: "Calculator" });
    const historyTab = screen.getByRole("tab", { name: "History" });
    const mathTab = screen.getByRole("tab", { name: "Math" });

    expect(overviewTab).toBeInTheDocument();
    expect(planTab).toBeInTheDocument();
    expect(calculatorTab).toBeInTheDocument();
    expect(historyTab).toBeInTheDocument();
    expect(mathTab).toBeInTheDocument();

    // Default active tab is "strategy" (Plan)
    expect(planTab).toHaveAttribute("aria-selected", "true");
    expect(overviewTab).toHaveAttribute("aria-selected", "false");

    // Click Overview tab and verify state switches
    fireEvent.click(overviewTab);
    expect(overviewTab).toHaveAttribute("aria-selected", "true");
    expect(planTab).toHaveAttribute("aria-selected", "false");
  });
});
