import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Scenarios from "./Scenarios";
import * as storage from "@/lib/storage";

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual("@/lib/storage");
  return {
    ...actual,
    getScenarios: vi.fn(),
  };
});

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Scenarios page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders accessible back button, filter inputs, and empty state when no scenarios exist", () => {
    vi.mocked(storage.getScenarios).mockReturnValue([]);

    render(
      <MemoryRouter>
        <Scenarios />
      </MemoryRouter>
    );

    const backButton = screen.getByRole("button", { name: "Back to portfolio overview" });
    expect(backButton).toBeInTheDocument();

    const tickerInput = screen.getByRole("textbox", { name: "Filter scenarios by ticker" });
    expect(tickerInput).toBeInTheDocument();

    const methodSelect = screen.getByRole("combobox", { name: "Filter scenarios by calculation method" });
    expect(methodSelect).toBeInTheDocument();

    expect(screen.getByText("No scenarios found.")).toBeInTheDocument();
  });

  it("renders scenario rows with keyboard accessibility and navigates on Enter key press", () => {
    vi.mocked(storage.getScenarios).mockReturnValue([
      {
        id: "scen-123",
        created_at: "2025-01-01T00:00:00.000Z",
        ticker: "AAPL",
        method: "price_shares",
        budget_invested: 1000,
        fee_applied: 5,
        total_spend: 1005,
        shares_to_buy: 10,
        new_avg_cost: 150,
      },
    ]);

    render(
      <MemoryRouter>
        <Scenarios />
      </MemoryRouter>
    );

    const scenarioRow = screen.getByRole("button", { name: "View scenario details for AAPL" });
    expect(scenarioRow).toBeInTheDocument();
    expect(scenarioRow).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(scenarioRow, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith("/scenarios/scen-123");
  });

  it("navigates to portfolio when back button is clicked", () => {
    vi.mocked(storage.getScenarios).mockReturnValue([]);

    render(
      <MemoryRouter>
        <Scenarios />
      </MemoryRouter>
    );

    const backButton = screen.getByRole("button", { name: "Back to portfolio overview" });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
