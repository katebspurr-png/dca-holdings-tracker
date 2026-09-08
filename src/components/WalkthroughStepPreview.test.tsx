import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WalkthroughStepPreview from "./WalkthroughStepPreview";

describe("WalkthroughStepPreview", () => {
  it("renders with aria-hidden='true' and select-none class for welcome step", () => {
    const { container } = render(<WalkthroughStepPreview id="welcome" />);
    const previewEl = container.firstElementChild;
    expect(previewEl).toHaveAttribute("aria-hidden", "true");
    expect(previewEl).toHaveClass("select-none");
  });

  it("renders with aria-hidden='true' for portfolio step", () => {
    const { container } = render(<WalkthroughStepPreview id="portfolio" />);
    const previewEl = container.firstElementChild;
    expect(previewEl).toHaveAttribute("aria-hidden", "true");
  });
});
