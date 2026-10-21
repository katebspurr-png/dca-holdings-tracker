import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WhatIfScenarios from "./WhatIfScenarios";
import { SimFeesProvider } from "@/contexts/SimFeesContext";

const mockHoldings = [
  { id: "h1", ticker: "AAPL", exchange: "US" as const, shares: 10, avg_cost: 150, initial_avg_cost: 150, fee: 0, fee_type: "flat" as const, fee_value: 0, created_at: "2024-01-01T00:00:00Z" },
];

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    getHoldings: vi.fn(() => [...mockHoldings]),
    getHolding: vi.fn((id: string) => mockHoldings.find((h) => h.id === id) || null),
    getWhatIfComparisons: vi.fn(() => []),
  };
});

describe("WhatIfScenarios micro-UX & accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header back button with accessible ARIA label and focus ring styles", () => {
    render(
      <MemoryRouter>
        <SimFeesProvider>
          <WhatIfScenarios />
        </SimFeesProvider>
      </MemoryRouter>
    );

    const backButton = screen.getByRole("button", { name: "Back to portfolio overview" });
    expect(backButton).toBeInTheDocument();
    expect(backButton.className).toContain("focus-visible:ring-2");
    expect(backButton.className).toContain("active:scale-95");
  });

  it("renders budget allocation mode buttons with aria-pressed and focus ring styles", () => {
    render(
      <MemoryRouter>
        <SimFeesProvider>
          <WhatIfScenarios />
        </SimFeesProvider>
      </MemoryRouter>
    );

    const dollarBtn = screen.getByRole("button", { name: "Dollar allocation mode" });
    const percentBtn = screen.getByRole("button", { name: "Percentage allocation mode" });

    expect(dollarBtn).toHaveAttribute("aria-pressed", "true");
    expect(percentBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(percentBtn);

    expect(dollarBtn).toHaveAttribute("aria-pressed", "false");
    expect(percentBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("renders allocation input fields with explicit ARIA labels", () => {
    render(
      <MemoryRouter>
        <SimFeesProvider>
          <WhatIfScenarios />
        </SimFeesProvider>
      </MemoryRouter>
    );

    const priceInput = screen.getByRole("spinbutton", { name: "Buy price for AAPL" });
    expect(priceInput).toBeInTheDocument();
    expect(priceInput.className).toContain("focus-visible:ring-2");
  });
});
