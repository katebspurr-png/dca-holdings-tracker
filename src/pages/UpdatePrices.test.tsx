import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import UpdatePrices from "./UpdatePrices";
import * as storage from "@/lib/storage";

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    getHoldings: vi.fn(),
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-refresh-prices", () => ({
  useRefreshPrices: () => ({
    refreshing: false,
    refreshAll: vi.fn().mockResolvedValue({ success: 1, failed: [] }),
    lastRefreshed: null,
  }),
  formatLastRefreshed: (val: number | null) => val ? "just now" : "",
}));

describe("UpdatePrices Page Accessibility and Interaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no holdings exist", () => {
    vi.mocked(storage.getHoldings).mockReturnValue([]);
    render(<UpdatePrices />);

    expect(screen.getByText(/No holdings yet. Add a holding before updating prices./i)).toBeInTheDocument();
  });

  it("renders holdings with accessible input labels and interactive controls", () => {
    vi.mocked(storage.getHoldings).mockReturnValue([
      {
        id: "h1",
        ticker: "AAPL",
        shares: 10,
        avg_cost: 150,
        exchange: "US",
        created_at: "2023-01-01",
      },
    ]);

    render(<UpdatePrices />);

    expect(screen.getByRole("button", { name: /Refresh Prices/i })).toBeInTheDocument();

    const priceInputs = screen.getAllByLabelText("Current price for AAPL");
    expect(priceInputs.length).toBeGreaterThan(0);

    const desktopInput = priceInputs[0];
    fireEvent.change(desktopInput, { target: { value: "180" } });

    expect(screen.getByRole("button", { name: /Save prices/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reset/i })).toBeInTheDocument();
  });
});
