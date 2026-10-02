import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ExperienceClassification from "./ExperienceClassification";

describe("ExperienceClassification", () => {
  it("renders modal dialog with accessible attributes and progressbar", () => {
    render(<ExperienceClassification onComplete={vi.fn()} onSkip={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "experience-classification-title");

    const progressbar = screen.getByRole("progressbar", { name: "Experience questionnaire progress" });
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute("aria-valuenow", "1");
    expect(progressbar).toHaveAttribute("aria-valuemin", "1");
    expect(progressbar).toHaveAttribute("aria-valuemax", "3");
  });

  it("handles step navigation, option selection with aria-pressed, and completion", () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();

    render(<ExperienceClassification onComplete={onComplete} onSkip={onSkip} />);

    // Step 0: Q1
    expect(screen.getByText("How do you usually manage your investments?")).toBeInTheDocument();
    const option0 = screen.getByRole("button", { name: "I'm just getting started" });
    expect(option0).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(option0);
    expect(option0).toHaveAttribute("aria-pressed", "true");

    const nextBtn = screen.getByRole("button", { name: "Next" });
    expect(nextBtn).not.toBeDisabled();
    fireEvent.click(nextBtn);

    // Step 1: Q2
    expect(screen.getByText("Have you used tools to model or simulate investments before?")).toBeInTheDocument();
    const progressbarStep2 = screen.getByRole("progressbar");
    expect(progressbarStep2).toHaveAttribute("aria-valuenow", "2");

    const option1 = screen.getByRole("button", { name: "A little" });
    fireEvent.click(option1);
    expect(option1).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    // Step 2: Q3
    expect(screen.getByText(/What are you hoping to do here\?/)).toBeInTheDocument();
    const progressbarStep3 = screen.getByRole("progressbar");
    expect(progressbarStep3).toHaveAttribute("aria-valuenow", "3");

    const option2 = screen.getByRole("button", { name: "Compare different scenarios" });
    fireEvent.click(option2);
    expect(option2).toHaveAttribute("aria-pressed", "true");

    const continueBtn = screen.getByRole("button", { name: "Continue" });
    fireEvent.click(continueBtn);

    expect(onComplete).toHaveBeenCalledWith({ q1: 0, q2: 1, q3: 2 });
  });

  it("calls onSkip when Skip button is clicked", () => {
    const onSkip = vi.fn();
    render(<ExperienceClassification onComplete={vi.fn()} onSkip={onSkip} />);

    const skipBtn = screen.getByRole("button", { name: "Skip" });
    fireEvent.click(skipBtn);

    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
