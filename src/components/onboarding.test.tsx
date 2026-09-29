import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Onboarding, { resetOnboarding } from "./onboarding";

describe("Onboarding component", () => {
  beforeEach(() => {
    resetOnboarding();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders with role dialog and accessibility attributes", () => {
    const handleDone = vi.fn();
    render(<Onboarding onDone={handleDone} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "onboarding-step-title");

    const title = screen.getByRole("heading", { level: 2 });
    expect(title).toHaveAttribute("id", "onboarding-step-title");

    const skipBtn = screen.getByRole("button", { name: /skip product tour/i });
    expect(skipBtn).toBeInTheDocument();

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("1 of");
  });

  it("navigates forward and backward through steps", () => {
    const handleDone = vi.fn();
    render(<Onboarding onDone={handleDone} />);

    const nextBtn = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextBtn);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("2 of");

    const backBtn = screen.getByRole("button", { name: /previous step/i });
    expect(backBtn).toBeInTheDocument();

    fireEvent.click(backBtn);
    expect(screen.getByRole("status")).toHaveTextContent("1 of");
  });

  it("calls onDone when skipped", () => {
    const handleDone = vi.fn();
    render(<Onboarding onDone={handleDone} />);

    const skipBtn = screen.getByRole("button", { name: /skip product tour/i });
    fireEvent.click(skipBtn);

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(handleDone).toHaveBeenCalledTimes(1);
  });
});
