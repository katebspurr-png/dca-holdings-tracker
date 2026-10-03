import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import HoldingDetail from "./HoldingDetail";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SimFeesProvider } from "@/contexts/SimFeesContext";

// Mock storage functions
vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    getHolding: vi.fn().mockImplementation((id: string) => {
      if (id === "holding-1") {
        return {
          id: "holding-1",
          ticker: "AAPL",
          shares: 10,
          avg_cost: 150,
          fee_type: "fixed",
          fee_value: 0,
          fee: 0,
          exchange: "US",
          currency: "USD",
        };
      }
      return undefined;
    }),
    getScenariosForHolding: vi.fn().mockReturnValue([]),
    getTransactionsForHolding: vi.fn().mockReturnValue([]),
  };
});

// Mock AuthContext and DemoModeContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({ isDemoMode: false }),
}));

describe("HoldingDetail UX & Accessibility", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderComponent = (holdingId = "holding-1") => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SimFeesProvider>
          <MemoryRouter initialEntries={[`/holding/${holdingId}`]}>
            <Routes>
              <Route path="/holding/:id" element={<HoldingDetail />} />
            </Routes>
          </MemoryRouter>
        </SimFeesProvider>
      </QueryClientProvider>
    );
  };

  it("renders back button with proper aria-label and focus-visible classes", () => {
    renderComponent();

    const backButton = screen.getByRole("button", { name: "Back to holdings" });
    expect(backButton).toBeInTheDocument();
    expect(backButton.className).toContain("focus-visible:ring-2");
    expect(backButton.className).toContain("active:scale-95");
  });

  it("renders workspace tablist and tabs with WAI-ARIA roles and selected state", () => {
    renderComponent();

    const tabList = screen.getByRole("tablist", { name: "Holding workspace sections" });
    expect(tabList).toBeInTheDocument();

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);

    // Default active tab is 'strategy' (Plan)
    const planTab = screen.getByRole("tab", { name: "Plan" });
    expect(planTab).toHaveAttribute("aria-selected", "true");
    expect(planTab.className).toContain("focus-visible:ring-2");
    expect(planTab.className).toContain("active:scale-95");

    const overviewTab = screen.getByRole("tab", { name: "Overview" });
    expect(overviewTab).toHaveAttribute("aria-selected", "false");

    // Switching tabs
    fireEvent.click(overviewTab);
    expect(overviewTab).toHaveAttribute("aria-selected", "true");
    expect(planTab).toHaveAttribute("aria-selected", "false");
  });

  it("renders preset buttons with focus-visible ring and tactile feedback on calculator tab", () => {
    renderComponent();

    // Switch to Calculator tab
    const calcTab = screen.getByRole("tab", { name: "Calculator" });
    fireEvent.click(calcTab);

    // Presets for shares field: +10, +25, +50, +100
    const presetBtn = screen.getByRole("button", { name: "+10" });
    expect(presetBtn).toBeInTheDocument();
    expect(presetBtn.className).toContain("focus-visible:ring-2");
    expect(presetBtn.className).toContain("active:scale-95");
  });
});
