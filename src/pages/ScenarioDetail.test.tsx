import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ScenarioDetail from "./ScenarioDetail";
import * as storageModule from "@/lib/storage";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("ScenarioDetail component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders scenario not found state when scenario does not exist", () => {
    vi.spyOn(storageModule, "getScenario").mockReturnValue(undefined);

    render(
      <MemoryRouter initialEntries={["/scenarios/non-existent-id"]}>
        <Routes>
          <Route path="/scenarios/:id" element={<ScenarioDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /scenario not found/i })).toBeInTheDocument();
    expect(
      screen.getByText(/the scenario you are looking for does not exist or may have been deleted/i)
    ).toBeInTheDocument();

    const backButton = screen.getByRole("button", { name: /back to saved scenarios/i });
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith("/scenarios");
  });

  it("renders scenario details correctly when scenario exists", () => {
    const mockScenario: storageModule.SavedScenario = {
      id: "scen-1",
      holding_id: "hold-1",
      ticker: "AAPL",
      created_at: "2025-01-01T12:00:00.000Z",
      method: "price_shares",
      input1_label: "Price",
      input1_value: 150.0,
      input2_label: "Shares",
      input2_value: 10,
      include_fees: true,
      fee_amount: 5.0,
      shares_to_buy: 10,
      budget_invested: 1500.0,
      fee_applied: 5.0,
      total_spend: 1505.0,
      new_total_shares: 50,
      new_avg_cost: 145.5,
      buy_price: 150.0,
      recommended_target: 140.0,
      budget_percent_used: 100,
      notes: "Test strategy note",
    };

    vi.spyOn(storageModule, "getScenario").mockReturnValue(mockScenario);

    render(
      <MemoryRouter initialEntries={["/scenarios/scen-1"]}>
        <Routes>
          <Route path="/scenarios/:id" element={<ScenarioDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /scenario —/i })).toBeInTheDocument();
    expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0);
    expect(screen.getByText("Price + Shares")).toBeInTheDocument();
    expect(screen.getByText("Test strategy note")).toBeInTheDocument();

    const openHoldingBtn = screen.getByRole("button", { name: /open holding for aapl/i });
    expect(openHoldingBtn).toBeInTheDocument();

    fireEvent.click(openHoldingBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/holdings/hold-1?tab=calculator");
  });
});
