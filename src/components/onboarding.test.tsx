import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Onboarding from "./onboarding";

describe("Onboarding component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders with proper WAI-ARIA dialog and progressbar attributes", () => {
    render(<Onboarding onDone={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "walkthrough-title");

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute("aria-valuenow", "1");
    expect(progressbar).toHaveAttribute("aria-valuemin", "1");
    expect(progressbar).toHaveAttribute("aria-label", "Walkthrough progress");
  });

  it("navigates through steps using Next and Back buttons", () => {
    render(<Onboarding onDone={vi.fn()} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");

    const nextButton = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextButton);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");

    const backButton = screen.getByRole("button", { name: /back/i });
    fireEvent.click(backButton);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  });

  it("calls onDone when Skip is clicked", () => {
    const onDoneMock = vi.fn();
    render(<Onboarding onDone={onDoneMock} />);

    const skipButton = screen.getByRole("button", { name: /skip/i });
    fireEvent.click(skipButton);

    vi.advanceTimersByTime(350);
    expect(onDoneMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("positionpilot-onboarding-done")).toBe("true");
  });
});
