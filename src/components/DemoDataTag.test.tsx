import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DemoDataTag } from "./DemoDataTag";

describe("DemoDataTag", () => {
  it("renders the Demo data text", () => {
    render(<DemoDataTag />);
    expect(screen.getByText("Demo data")).toBeInTheDocument();
  });

  it("has status role and descriptive aria-label for accessibility", () => {
    render(<DemoDataTag />);
    const tag = screen.getByRole("status");
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveAttribute("aria-label", "Demonstration data mode indicator");
  });

  it("applies custom className when provided", () => {
    render(<DemoDataTag className="custom-test-class" />);
    const tag = screen.getByRole("status");
    expect(tag).toHaveClass("custom-test-class");
  });
});
