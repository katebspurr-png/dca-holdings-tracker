import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import CsvImportDialog from "./CsvImportDialog";

describe("CsvImportDialog", () => {
  it("renders the file upload step when open", () => {
    render(<CsvImportDialog open={true} onOpenChange={() => {}} onImported={() => {}} />);

    expect(screen.getByText("Import from CSV")).toBeInTheDocument();
    expect(screen.getByText("Choose File")).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(<CsvImportDialog open={false} onOpenChange={() => {}} onImported={() => {}} />);

    expect(screen.queryByText("Import from CSV")).not.toBeInTheDocument();
  });
});
