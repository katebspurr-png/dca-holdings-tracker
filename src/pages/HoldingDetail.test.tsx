import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import HoldingDetail from "./HoldingDetail";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SimFeesProvider } from "@/contexts/SimFeesContext";

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual("@/lib/storage");
  return {
    ...actual,
    getHolding: vi.fn().mockImplementation((id: string) => {
      if (id === "test-holding-1") {
        return {
          id: "test-holding-1",
          ticker: "AAPL",
          shares: 10,
          avg_cost: 150,
          current_price: 140,
          exchange: "US",
          fee_type: "flat",
          fee_value: 0,
        };
      }
      return undefined;
    }),
    getScenariosForHolding: vi.fn().mockReturnValue([]),
    getTransactionsForHolding: vi.fn().mockReturnValue([]),
    currencyPrefix: () => "$",
    exchangeLabel: () => "US Market",
    apiTicker: (t: string) => t,
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, session: null }),
}));

vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({ isDemoMode: false }),
}));

describe("HoldingDetail page UX & accessibility", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("renders back button with aria-label and accessible tablist with tabs", () => {
    render(
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

    // Verify back button aria-label
    const backBtn = screen.getByRole("button", { name: "Back to holdings list" });
    expect(backBtn).toBeInTheDocument();

    // Verify workspace tablist
    const tablist = screen.getByRole("tablist", { name: "Position workspace tabs" });
    expect(tablist).toBeInTheDocument();

    // Verify individual tabs
    const overviewTab = screen.getByRole("tab", { name: /overview/i });
    const planTab = screen.getByRole("tab", { name: /plan/i });
    const calcTab = screen.getByRole("tab", { name: /calculator/i });

    expect(overviewTab).toBeInTheDocument();
    expect(planTab).toBeInTheDocument();
    expect(calcTab).toBeInTheDocument();

    // Default tab is "strategy" (Plan)
    expect(planTab).toHaveAttribute("aria-selected", "true");
    expect(overviewTab).toHaveAttribute("aria-selected", "false");

    // Switching tabs
    fireEvent.click(overviewTab);
    expect(overviewTab).toHaveAttribute("aria-selected", "true");
    expect(planTab).toHaveAttribute("aria-selected", "false");
  });
});
