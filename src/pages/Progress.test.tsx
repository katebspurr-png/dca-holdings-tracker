import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import Progress from "./Progress";

vi.mock("@/lib/storage", () => ({
  getHoldings: vi.fn(() => []),
}));

vi.mock("@/hooks/use-storage-revision", () => ({
  useStorageRevision: vi.fn(),
}));

describe("Progress Page UX & Accessibility", () => {
  it("renders the return to portfolio button with explicit accessibility aria-label", () => {
    render(
      <MemoryRouter>
        <Progress />
      </MemoryRouter>
    );

    const backButton = screen.getByRole("link", { name: "Back to portfolio overview" });
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveAttribute("href", "/");
  });
});
