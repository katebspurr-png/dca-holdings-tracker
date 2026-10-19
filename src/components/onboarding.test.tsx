import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Onboarding, { getOnboardingDone, setOnboardingDone, resetOnboarding } from "./onboarding";

describe("Onboarding component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("helper functions set and get onboarding completion state in localStorage", () => {
    expect(getOnboardingDone()).toBe(false);
    setOnboardingDone();
    expect(getOnboardingDone()).toBe(true);
    resetOnboarding();
    expect(getOnboardingDone()).toBe(false);
  });

  it("renders with proper WAI-ARIA dialog and progressbar attributes", () => {
    render(<Onboarding onDone={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "onboarding-step-title");

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "1");
    expect(progressbar).toHaveAttribute("aria-valuemin", "1");
  });

  it("allows advancing through steps with Next and Back buttons", () => {
    render(<Onboarding onDone={vi.fn()} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");

    const nextBtn = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");

    const backBtn = screen.getByRole("button", { name: /previous step/i });
    fireEvent.click(backBtn);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  });

  it("calls onDone when Skip button is clicked", () => {
    vi.useFakeTimers();
    const onDoneMock = vi.fn();
    render(<Onboarding onDone={onDoneMock} />);

    const skipBtn = screen.getByRole("button", { name: /skip walkthrough/i });
    fireEvent.click(skipBtn);

    vi.advanceTimersByTime(350);
    expect(onDoneMock).toHaveBeenCalledTimes(1);
    expect(getOnboardingDone()).toBe(true);
    vi.useRealTimers();
  });

  it("renders final step CTAs when on last step", () => {
    vi.useFakeTimers();
    const onDoneMock = vi.fn();
    const onSetUpPortfolioMock = vi.fn();
    const onTryDemoMock = vi.fn();

    render(
      <Onboarding
        onDone={onDoneMock}
        onSetUpPortfolio={onSetUpPortfolioMock}
        showSetUpPortfolioCta={true}
        onTryDemo={onTryDemoMock}
      />,
    );

    // Navigate to the final step
    const totalSteps = Number(screen.getByRole("progressbar").getAttribute("aria-valuemax"));
    for (let i = 1; i < totalSteps; i++) {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
    }

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(totalSteps));

    const startBtn = screen.getByRole("button", { name: /start exploring/i });
    expect(startBtn).toBeInTheDocument();

    const addPortfolioBtn = screen.getByRole("button", { name: /add your portfolio/i });
    expect(addPortfolioBtn).toBeInTheDocument();

    const tryDemoBtn = screen.getByRole("button", { name: /try demo/i });
    expect(tryDemoBtn).toBeInTheDocument();

    fireEvent.click(tryDemoBtn);
    vi.advanceTimersByTime(350);

    expect(onDoneMock).toHaveBeenCalledTimes(1);
    expect(onTryDemoMock).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
