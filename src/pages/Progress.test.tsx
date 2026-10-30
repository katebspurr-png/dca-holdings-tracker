import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Progress from "./Progress";
import * as storageModule from "@/lib/storage";

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof storageModule>("@/lib/storage");
  return {
    ...actual,
    getHoldings: vi.fn(),
  };
});

describe("Progress Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header, h1 title, and empty state when there are no holdings", () => {
    vi.mocked(storageModule.getHoldings).mockReturnValue([]);

    render(
      <MemoryRouter>
        <Progress />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Strategy Progress" })).toBeInTheDocument();

    const backButtons = screen.getAllByRole("link", { name: /back to portfolio/i });
    expect(backButtons.length).toBeGreaterThanOrEqual(1);
    expect(backButtons[0]).toHaveAttribute("aria-label", "Back to portfolio overview");

    expect(screen.getByText("No holdings yet — add positions from the portfolio screen.")).toBeInTheDocument();
  });

  it("renders holdings progress section when holdings exist", () => {
    vi.mocked(storageModule.getHoldings).mockReturnValue([
      {
        id: "1",
        ticker: "AAPL",
        shares: 10,
        avg_cost: 150,
        initial_avg_cost: 160,
        exchange: "US",
      },
    ]);

    render(
      <MemoryRouter>
        <Progress />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Strategy Progress" })).toBeInTheDocument();
    expect(screen.getByText("Progress vs initial snapshot")).toBeInTheDocument();
  });
});
