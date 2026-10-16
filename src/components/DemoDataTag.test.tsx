import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DemoDataTag } from "./DemoDataTag";

describe("DemoDataTag", () => {
  it("renders with status role and aria label", () => {
    render(<DemoDataTag />);
    const tag = screen.getByRole("status");
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveAttribute("aria-label", "Demo data indicator");
    expect(tag).toHaveTextContent("Demo data");
  });

  it("applies custom className when provided", () => {
    render(<DemoDataTag className="custom-test-class" />);
    const tag = screen.getByRole("status");
    expect(tag).toHaveClass("custom-test-class");
    expect(tag).toHaveClass("uppercase");
  });
});
