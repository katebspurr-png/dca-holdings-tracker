import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryRouter, useNavigate } from "react-router-dom";
import Scenarios from "./Scenarios";
import { getScenarios, ScenarioCalculation } from "@/lib/storage";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return {
    ...actual,
    getScenarios: vi.fn(),
  };
});

describe("Scenarios page", () => {
  const mockNavigate = vi.fn();

  const sampleScenarios: ScenarioCalculation[] = [
    {
      id: "scen-1",
      ticker: "AAPL",
      method: "price_budget",
      budget_invested: 1000,
      fee_applied: 5,
      total_spend: 1005,
      shares_to_buy: 10,
      new_avg_cost: 150,
      created_at: "2025-01-15T12:00:00Z",
    },
    {
      id: "scen-2",
      ticker: "MSFT",
      method: "price_shares",
      budget_invested: 2000,
      fee_applied: 10,
      total_spend: 2010,
      shares_to_buy: 5,
      new_avg_cost: 400,
      created_at: "2025-01-16T12:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(getScenarios).mockReturnValue(sampleScenarios);
  });

  it("renders Back button with explicit aria-label and navigates to overview", () => {
    render(
      <MemoryRouter>
        <Scenarios />
      </MemoryRouter>
    );

    const backButton = screen.getByRole("button", { name: "Back to portfolio overview" });
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("renders scenario filter inputs with ARIA labels and filters table rows", () => {
    render(
      <MemoryRouter>
        <Scenarios />
      </MemoryRouter>
    );

    const tickerInput = screen.getByLabelText("Filter scenarios by ticker");
    expect(tickerInput).toBeInTheDocument();

    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("MSFT")).toBeInTheDocument();

    fireEvent.change(tickerInput, { target: { value: "AAPL" } });

    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.queryByText("MSFT")).not.toBeInTheDocument();
  });

  it("supports mouse click and keyboard navigation (Enter/Space) on scenario rows", () => {
    render(
      <MemoryRouter>
        <Scenarios />
      </MemoryRouter>
    );

    const row1 = screen.getByRole("button", { name: /View scenario details for AAPL/i });
    expect(row1).toBeInTheDocument();
    expect(row1).toHaveAttribute("tabIndex", "0");

    fireEvent.click(row1);
    expect(mockNavigate).toHaveBeenCalledWith("/scenarios/scen-1");

    mockNavigate.mockClear();

    fireEvent.keyDown(row1, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith("/scenarios/scen-1");

    mockNavigate.mockClear();

    fireEvent.keyDown(row1, { key: " " });
    expect(mockNavigate).toHaveBeenCalledWith("/scenarios/scen-1");
  });
});
