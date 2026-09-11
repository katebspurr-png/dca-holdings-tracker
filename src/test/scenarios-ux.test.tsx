import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Scenarios from "@/pages/Scenarios";
import { addScenario } from "@/lib/storage";

describe("Scenarios UX & Accessibility", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders filter inputs with proper aria-label attributes", () => {
    render(
      <MemoryRouter>
        <Scenarios />
      </MemoryRouter>
    );

    const tickerInput = screen.getByLabelText("Filter scenarios by ticker");
    expect(tickerInput).toBeInTheDocument();

    const methodSelect = screen.getByLabelText("Filter scenarios by calculation method");
    expect(methodSelect).toBeInTheDocument();
  });

  it("renders scenario rows with button role, tabIndex, and aria-label", () => {
    addScenario({
      holding_id: "hold-1",
      ticker: "AAPL",
      method: "price_shares",
      input1_label: "Price",
      input1_value: 150,
      input2_label: "Shares",
      input2_value: 10,
      include_fees: false,
      fee_amount: 0,
      buy_price: 150,
      shares_to_buy: 10,
      budget_invested: 1500,
      fee_applied: 5,
      total_spend: 1505,
      new_total_shares: 110,
      new_avg_cost: 145,
      recommended_target: null,
      budget_percent_used: null,
      notes: null,
    });

    render(
      <MemoryRouter>
        <Scenarios />
      </MemoryRouter>
    );

    const rowButton = screen.getByRole("button", {
      name: /View scenario details for AAPL/i,
    });

    expect(rowButton).toBeInTheDocument();
    expect(rowButton).toHaveAttribute("tabIndex", "0");
  });
});
