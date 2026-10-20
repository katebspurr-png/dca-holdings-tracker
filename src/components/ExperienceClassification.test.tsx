import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ExperienceClassification from "./ExperienceClassification";

describe("ExperienceClassification", () => {
  it("renders with modal dialog semantics and progressbar attributes", () => {
    const handleComplete = vi.fn();
    const handleSkip = vi.fn();

    render(<ExperienceClassification onComplete={handleComplete} onSkip={handleSkip} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "experience-modal-heading");

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute("aria-valuenow", "1");
    expect(progressbar).toHaveAttribute("aria-valuemin", "1");
    expect(progressbar).toHaveAttribute("aria-valuemax", "3");
    expect(progressbar).toHaveAttribute("aria-valuetext", "Step 1 of 3");
  });

  it("allows selecting options and completing the classification survey", () => {
    const handleComplete = vi.fn();
    const handleSkip = vi.fn();

    render(<ExperienceClassification onComplete={handleComplete} onSkip={handleSkip} />);

    // Step 1: Select q1 option
    const q1Option = screen.getByRole("button", { name: "I track a few investments" });
    expect(q1Option).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(q1Option);
    expect(q1Option).toHaveAttribute("aria-pressed", "true");

    // Click Next
    const nextBtn = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextBtn);

    // Step 2: Select q2 option
    const q2Option = screen.getByRole("button", { name: "Yes" });
    expect(q2Option).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(q2Option);
    expect(q2Option).toHaveAttribute("aria-pressed", "true");

    // Click Next
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // Step 3: Select q3 option and finish
    const q3Option = screen.getByRole("button", { name: "Compare different scenarios" });
    fireEvent.click(q3Option);

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(continueBtn);

    expect(handleComplete).toHaveBeenCalledTimes(1);
    expect(handleComplete).toHaveBeenCalledWith({
      q1: 1,
      q2: 2,
      q3: 2,
    });
  });

  it("calls onSkip when skip button is clicked", () => {
    const handleComplete = vi.fn();
    const handleSkip = vi.fn();

    render(<ExperienceClassification onComplete={handleComplete} onSkip={handleSkip} />);

    const skipBtn = screen.getByRole("button", { name: /skip/i });
    fireEvent.click(skipBtn);

    expect(handleSkip).toHaveBeenCalledTimes(1);
  });
});
