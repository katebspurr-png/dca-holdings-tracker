import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import WhatIfScenarios from "./WhatIfScenarios";

// Mock router navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock storage
vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return {
    ...actual,
    STORAGE_CHANGE_EVENT: "positionpilot_storage_change",
    getHoldings: () => [
      { id: "1", ticker: "AAPL", exchange: "US", shares: 10, avg_cost: 150 },
      { id: "2", ticker: "MSFT", exchange: "US", shares: 5, avg_cost: 300 },
    ],
    getHolding: (id: string) => ({ id, ticker: id === "1" ? "AAPL" : "MSFT", exchange: "US", shares: 10, avg_cost: 150 }),
    addWhatIfComparison: vi.fn(),
    getWhatIfComparisons: () => [],
    removeWhatIfComparison: vi.fn(),
    applyBuyToHolding: vi.fn(),
    currencyPrefix: () => "$",
    exchangeLabel: () => "NASDAQ",
    apiTicker: (t: string) => t,
  };
});

// Mock SimFeesContext
vi.mock("@/contexts/SimFeesContext", () => ({
  useSimFees: () => ({
    includeFees: false,
    setIncludeFees: vi.fn(),
  }),
}));

// Mock pre-auth hook
vi.mock("@/hooks/use-pre-auth-save-upsell", () => ({
  usePreAuthSaveUpsell: () => ({
    requestPersist: (cb: () => void) => cb(),
    preAuthUpsellDialog: null,
  }),
}));

describe("WhatIfScenarios Page Accessibility & UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders back button with proper aria-label and navigates to overview", () => {
    render(
      <MemoryRouter>
        <WhatIfScenarios />
      </MemoryRouter>
    );

    const backButton = screen.getByRole("button", { name: "Back to portfolio overview" });
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("renders mode toggle buttons with ARIA attributes", () => {
    render(
      <MemoryRouter>
        <WhatIfScenarios />
      </MemoryRouter>
    );

    const dollarButton = screen.getByRole("button", { name: "Allocate in dollar amounts" });
    const percentButton = screen.getByRole("button", { name: "Allocate in percentage amounts" });

    expect(dollarButton).toHaveAttribute("aria-pressed", "true");
    expect(percentButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(percentButton);
    expect(dollarButton).toHaveAttribute("aria-pressed", "false");
    expect(percentButton).toHaveAttribute("aria-pressed", "true");
  });

  it("renders stock buy price and allocation inputs with appropriate aria-labels", () => {
    render(
      <MemoryRouter>
        <WhatIfScenarios />
      </MemoryRouter>
    );

    const aaplPriceInput = screen.getByRole("spinbutton", { name: "Buy price for AAPL" });
    expect(aaplPriceInput).toBeInTheDocument();

    const msftPriceInput = screen.getByRole("spinbutton", { name: "Buy price for MSFT" });
    expect(msftPriceInput).toBeInTheDocument();
  });
});
