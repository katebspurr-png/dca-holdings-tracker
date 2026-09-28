import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CsvImportDialog from "./CsvImportDialog";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock storage
vi.mock("@/lib/storage", () => ({
  getHoldings: vi.fn(() => []),
  addHolding: vi.fn(() => ({ id: "mock-id-1" })),
  editHolding: vi.fn(),
}));

describe("CsvImportDialog UX and Accessibility", () => {
  it("renders file chooser button with explicit ARIA label when open", () => {
    const handleOpenChange = vi.fn();
    const handleImported = vi.fn();

    render(
      <CsvImportDialog
        open={true}
        onOpenChange={handleOpenChange}
        onImported={handleImported}
      />
    );

    const chooseBtn = screen.getByRole("button", {
      name: /Choose CSV or TSV file to import/i,
    });
    expect(chooseBtn).toBeInTheDocument();
  });

  it("does not render contents when closed", () => {
    render(
      <CsvImportDialog
        open={false}
        onOpenChange={vi.fn()}
        onImported={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /Choose CSV or TSV file to import/i })).not.toBeInTheDocument();
  });
});
