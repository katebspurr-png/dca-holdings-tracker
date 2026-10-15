import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import Progress from "./Progress";

vi.mock("@/lib/storage", () => ({
  getHoldings: vi.fn().mockReturnValue([
    {
      id: "1",
      ticker: "AAPL",
      shares: 10,
      avg_cost: 150,
      initial_avg_cost: 160,
      exchange: "NASDAQ",
    },
  ]),
}));

vi.mock("@/hooks/use-storage-revision", () => ({
  useStorageRevision: vi.fn().mockReturnValue(0),
}));

describe("Progress Page", () => {
  it("renders progress header explanation and back link", () => {
    render(
      <MemoryRouter>
        <Progress />
      </MemoryRouter>
    );

    const backLink = screen.getByRole("link", { name: "Back to portfolio" });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/");
    expect(screen.getByText(/portfolio-wide progress versus the average cost snapshot/i)).toBeInTheDocument();
  });
});
