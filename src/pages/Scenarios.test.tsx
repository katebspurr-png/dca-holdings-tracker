import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import Scenarios from "./Scenarios";
import * as storage from "@/lib/storage";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    getScenarios: vi.fn(),
  };
});

describe("Scenarios page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no scenarios exist", () => {
    vi.spyOn(storage, "getScenarios").mockReturnValue([]);

    render(<Scenarios />);

    expect(screen.getByRole("status")).toHaveTextContent("No scenarios found.");
    expect(screen.getByLabelText("Filter scenarios by ticker")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter scenarios by method")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to portfolio overview" })).toBeInTheDocument();
  });

  it("renders scenarios table and handles keyboard navigation on scenario rows", () => {
    const mockScenarios = [
      {
        id: "scen-1",
        holding_id: "hold-1",
        ticker: "AAPL",
        method: "price_budget",
        buy_price: 150,
        budget_invested: 1000,
        fee_applied: 5,
        total_spend: 1005,
        shares_to_buy: 6.6667,
        new_avg_cost: 165.5,
        created_at: "2025-01-15T12:00:00Z",
      },
    ];
    vi.spyOn(storage, "getScenarios").mockReturnValue(mockScenarios);

    render(<Scenarios />);

    const scenarioRow = screen.getByRole("button", { name: /View scenario details for AAPL/i });
    expect(scenarioRow).toBeInTheDocument();
    expect(scenarioRow).toHaveAttribute("tabIndex", "0");

    fireEvent.keyDown(scenarioRow, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith("/scenarios/scen-1");
  });

  it("navigates back to portfolio when back button is clicked", () => {
    vi.spyOn(storage, "getScenarios").mockReturnValue([]);

    render(<Scenarios />);

    const backButton = screen.getByRole("button", { name: "Back to portfolio overview" });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
