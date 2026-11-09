import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import Holdings from "./Holdings";
import { SimFeesProvider } from "@/contexts/SimFeesContext";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { resetAll, addHolding } from "@/lib/storage";

function renderHoldings() {
  return render(
    <BrowserRouter>
      <DemoModeProvider>
        <SimFeesProvider>
          <Holdings />
        </SimFeesProvider>
      </DemoModeProvider>
    </BrowserRouter>
  );
}

describe("Holdings toolbar accessibility and interaction", () => {
  beforeEach(() => {
    localStorage.clear();
    resetAll();
    addHolding({
      ticker: "AAPL",
      shares: 10,
      avg_cost: 150,
      exchange: "US",
    });
  });

  it("renders Grid view and List view buttons with correct aria attributes", () => {
    renderHoldings();

    const gridBtn = screen.getByRole("button", { name: "Grid view" });
    const listBtn = screen.getByRole("button", { name: "List view" });
    const sortBtn = screen.getByRole("button", { name: /Sort/i });

    expect(gridBtn).toBeInTheDocument();
    expect(listBtn).toBeInTheDocument();
    expect(sortBtn).toBeInTheDocument();

    expect(gridBtn).toHaveAttribute("aria-pressed", "true");
    expect(listBtn).toHaveAttribute("aria-pressed", "false");

    // Switching layout updates aria-pressed
    fireEvent.click(listBtn);
    expect(listBtn).toHaveAttribute("aria-pressed", "true");
    expect(gridBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("applies design-system focus and tactile feedback classes to toolbar buttons", () => {
    renderHoldings();

    const gridBtn = screen.getByRole("button", { name: "Grid view" });
    const listBtn = screen.getByRole("button", { name: "List view" });
    const sortBtn = screen.getByRole("button", { name: /Sort/i });

    expect(gridBtn.className).toContain("focus-visible:ring-stitch-accent/50");
    expect(gridBtn.className).toContain("active:scale-95");

    expect(listBtn.className).toContain("focus-visible:ring-stitch-accent/50");
    expect(listBtn.className).toContain("active:scale-95");

    expect(sortBtn.className).toContain("focus-visible:ring-stitch-accent/50");
    expect(sortBtn.className).toContain("active:scale-95");
  });
});
