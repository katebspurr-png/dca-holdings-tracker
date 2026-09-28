import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CsvImportDialog from "./CsvImportDialog";

describe("CsvImportDialog", () => {
  it("renders the file pick step when open", () => {
    render(<CsvImportDialog open={true} onOpenChange={vi.fn()} onImported={vi.fn()} />);

    expect(screen.getByText("Import from CSV")).toBeInTheDocument();
    expect(screen.getByText("Select a CSV or TSV file exported from your brokerage.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose file/i })).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(<CsvImportDialog open={false} onOpenChange={vi.fn()} onImported={vi.fn()} />);

    expect(screen.queryByText("Import from CSV")).not.toBeInTheDocument();
  });
});
