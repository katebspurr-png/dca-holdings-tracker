import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Holdings from "./Holdings";
import * as storage from "@/lib/storage";

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    getHoldings: vi.fn(),
    getScenariosForHolding: vi.fn(() => []),
    isDemoModeSessionActive: vi.fn(() => true),
  };
});

vi.mock("@/hooks/use-refresh-prices", () => ({
  useRefreshPrices: () => ({
    refreshing: false,
    refreshAll: vi.fn(),
    lastRefreshed: null,
  }),
  formatLastRefreshed: () => "",
}));

vi.mock("@/contexts/SimFeesContext", () => ({
  useSimFees: () => ({
    includeFees: false,
    setIncludeFees: vi.fn(),
  }),
}));

vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({
    isDemoMode: true,
  }),
}));

describe("Holdings Page Accessibility & UX Controls", () => {
  const mockHoldings: storage.Holding[] = [
    {
      id: "h1",
      ticker: "AAPL",
      shares: 10,
      avg_cost: 150,
      exchange: "US",
      created_at: new Date().toISOString(),
      initial_avg_cost: 150,
    },
  ];

  it("renders holding card with accessible aria-labels and keyboard trigger attributes", () => {
    vi.mocked(storage.getHoldings).mockReturnValue(mockHoldings);

    render(
      <MemoryRouter>
        <Holdings />
      </MemoryRouter>
    );

    const holdingArticle = screen.getByRole("button", { name: /Holding position for AAPL/i });
    expect(holdingArticle).toBeInTheDocument();
    expect(holdingArticle).toHaveAttribute("tabIndex", "0");

    const editBtn = screen.getByRole("button", { name: /Edit position for AAPL/i });
    expect(editBtn).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button", { name: /Delete position for AAPL/i });
    expect(deleteBtn).toBeInTheDocument();

    const addBtn = screen.getByRole("button", { name: /Add new stock position/i });
    expect(addBtn).toBeInTheDocument();
  });
});
