import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ScenarioDetail from "./ScenarioDetail";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import * as storage from "@/lib/storage";

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

  it("renders 'Scenario Not Found' state when scenario does not exist", () => {
    vi.spyOn(storage, "getScenario").mockReturnValue(undefined);

    render(
      <MemoryRouter initialEntries={["/scenarios/non-existent-id"]}>
        <Routes>
          <Route path="/scenarios/:id" element={<ScenarioDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /scenario not found/i })).toBeInTheDocument();

    const backBtn = screen.getByRole("button", { name: /back to scenarios list/i });
    expect(backBtn).toBeInTheDocument();

    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/scenarios");
  });

  it("renders scenario details and accessible controls when scenario exists", () => {
    const sampleScenario = {
      id: "scen-123",
      holding_id: "holding-456",
      ticker: "AAPL",
      method: "price_budget",
      input1_label: "Share Price",
      input1_value: 150.0,
      input2_label: "Budget",
      input2_value: 1000.0,
      shares_to_buy: 6.6666,
      budget_invested: 1000.0,
      include_fees: true,
      fee_amount: 5.0,
      fee_applied: 5.0,
      total_spend: 1005.0,
      new_total_shares: 56.6666,
      new_avg_cost: 165.25,
      buy_price: 150.0,
      recommended_target: 160.0,
      budget_percent_used: 100,
      notes: "Test scenario note",
      created_at: new Date().toISOString(),
    };

    vi.spyOn(storage, "getScenario").mockReturnValue(sampleScenario as any);

    render(
      <MemoryRouter initialEntries={["/scenarios/scen-123"]}>
        <Routes>
          <Route path="/scenarios/:id" element={<ScenarioDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0);
    expect(screen.getByText("Test scenario note")).toBeInTheDocument();

    const backBtn = screen.getByRole("button", { name: /back to scenarios list/i });
    expect(backBtn).toBeInTheDocument();

    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/scenarios");

    const holdingBtn = screen.getByRole("button", { name: /open holding/i });
    expect(holdingBtn).toBeInTheDocument();

    fireEvent.click(holdingBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/holdings/holding-456?tab=calculator");
  });
});
