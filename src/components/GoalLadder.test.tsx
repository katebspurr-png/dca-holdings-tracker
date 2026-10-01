import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GoalLadder from "./GoalLadder";
import { SimFeesProvider } from "@/contexts/SimFeesContext";
import * as stockPriceModule from "@/lib/stock-price";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockHolding = {
  id: "test-holding-1",
  ticker: "AAPL",
  shares: 10,
  avg_cost: 150,
  exchange: "US",
};

describe("GoalLadder Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders prompt to add price when cached quote is missing", () => {
    vi.spyOn(stockPriceModule, "getCachedQuote").mockReturnValue(null);

    render(
      <MemoryRouter>
        <SimFeesProvider>
          <GoalLadder holding={mockHolding} />
        </SimFeesProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Budget-step simulator/i)).toBeInTheDocument();
    expect(screen.getByText(/Add a current market price/i)).toBeInTheDocument();

    const updateBtn = screen.getByRole("button", { name: /Update Prices/i });
    expect(updateBtn).toBeInTheDocument();

    fireEvent.click(updateBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/update-prices");
  });

  it("renders non-underwater message when price is at or above average cost", () => {
    vi.spyOn(stockPriceModule, "getCachedQuote").mockReturnValue({
      price: 160,
      timestamp: Date.now(),
      stale: false,
    });

    render(
      <MemoryRouter>
        <SimFeesProvider>
          <GoalLadder holding={mockHolding} />
        </SimFeesProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Current price is at or above your average/i)).toBeInTheDocument();
  });

  it("renders budget-step ladder rows when holding is underwater", () => {
    vi.spyOn(stockPriceModule, "getCachedQuote").mockReturnValue({
      price: 100,
      timestamp: Date.now(),
      stale: false,
    });

    render(
      <MemoryRouter>
        <SimFeesProvider>
          <GoalLadder holding={mockHolding} />
        </SimFeesProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Uses preset dollar amounts/i)).toBeInTheDocument();
    expect(screen.getByText(/Illustrative rung/i)).toBeInTheDocument();
  });
});
