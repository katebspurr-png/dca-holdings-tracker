import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CsvImportDialog from "./CsvImportDialog";

describe("CsvImportDialog accessibility and UX", () => {
  it("renders dialog with accessible title, description, and file input trigger", () => {
    render(
      <CsvImportDialog
        open={true}
        onOpenChange={vi.fn()}
        onImported={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /import from csv/i })).toBeInTheDocument();
    expect(screen.getByText(/select a csv or tsv file exported from your brokerage/i)).toBeInTheDocument();

    const chooseButton = screen.getByRole("button", { name: /choose file/i });
    expect(chooseButton).toBeInTheDocument();
    expect(chooseButton.className).toContain("focus-visible:ring-2");
    expect(chooseButton.className).toContain("active:scale-95");

    const fileInput = screen.getByLabelText(/upload csv or tsv file/i);
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute("type", "file");
  });

  it("marks decorative icons in dialog with aria-hidden='true'", () => {
    render(
      <CsvImportDialog
        open={true}
        onOpenChange={vi.fn()}
        onImported={vi.fn()}
      />
    );

    const spreadsheetIcon = document.querySelector(".lucide-file-spreadsheet");
    expect(spreadsheetIcon).toBeInTheDocument();
    expect(spreadsheetIcon).toHaveAttribute("aria-hidden", "true");

    const uploadIcon = document.querySelector(".lucide-upload");
    expect(uploadIcon).toBeInTheDocument();
    expect(uploadIcon).toHaveAttribute("aria-hidden", "true");
  });
});
