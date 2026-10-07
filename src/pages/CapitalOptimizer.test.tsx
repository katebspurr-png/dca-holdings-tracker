import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import CapitalOptimizer from "./CapitalOptimizer";
import * as featureAccess from "@/lib/feature-access";
import * as storage from "@/lib/storage";

vi.mock("@/lib/feature-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/feature-access")>();
  return {
    ...actual,
    hasFeature: vi.fn(),
  };
});

vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return {
    ...actual,
    getHoldings: vi.fn(),
  };
});

vi.mock("@/lib/price-cache", () => ({
  getCachedPrice: vi.fn(() => 50),
}));

vi.mock("@/contexts/SimFeesContext", () => ({
  useSimFees: () => ({
    includeFees: false,
    setIncludeFees: vi.fn(),
  }),
}));

describe("CapitalOptimizer Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders premium gate when optimizer feature is locked", () => {
    vi.mocked(featureAccess.hasFeature).mockReturnValue(false);
    vi.mocked(storage.getHoldings).mockReturnValue([]);

    render(
      <MemoryRouter>
        <CapitalOptimizer />
      </MemoryRouter>
    );

    expect(screen.getByText("Budget lab")).toBeInTheDocument();
    expect(screen.getByText("Get early access")).toBeInTheDocument();
  });

  it("renders optimizer controls when optimizer feature is unlocked", () => {
    vi.mocked(featureAccess.hasFeature).mockReturnValue(true);
    vi.mocked(storage.getHoldings).mockReturnValue([
      {
        id: "1",
        ticker: "AAPL",
        shares: 10,
        averagePrice: 150,
        exchange: "US",
      },
    ]);

    render(
      <MemoryRouter>
        <CapitalOptimizer />
      </MemoryRouter>
    );

    expect(screen.getByText("Budget lab")).toBeInTheDocument();
    expect(screen.getByLabelText(/Budget/i)).toBeInTheDocument();

    const modelButton = screen.getByRole("button", { name: "Model allocation" });
    expect(modelButton).toBeInTheDocument();

    fireEvent.click(modelButton);

    expect(screen.getByText("Modeled allocation")).toBeInTheDocument();
  });

  it("allows reloading price cache via reload button", () => {
    vi.mocked(featureAccess.hasFeature).mockReturnValue(true);
    vi.mocked(storage.getHoldings).mockReturnValue([]);

    render(
      <MemoryRouter>
        <CapitalOptimizer />
      </MemoryRouter>
    );

    const reloadBtn = screen.getByRole("button", { name: "Reload cache" });
    expect(reloadBtn).toBeInTheDocument();

    fireEvent.click(reloadBtn);
  });
});
