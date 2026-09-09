import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import ProSettings from "./ProSettings";
import { setPro } from "@/lib/pro";

describe("ProSettings Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders trigger button with Free Plan aria-label by default", () => {
    render(<ProSettings />);
    const button = screen.getByRole("button", { name: "Free Plan settings" });
    expect(button).toBeInTheDocument();
  });

  it("opens modal and displays progressbar and upgrade actions when on free plan", () => {
    render(<ProSettings />);
    const trigger = screen.getByRole("button", { name: "Free Plan settings" });
    fireEvent.click(trigger);

    expect(screen.getByRole("heading", { name: "Free Plan" })).toBeInTheDocument();

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute("aria-label", "Price lookups remaining today");
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "5");

    const upgradeBtn = screen.getByRole("button", { name: "Upgrade to Pro plan for $3.99" });
    expect(upgradeBtn).toBeInTheDocument();

    const restoreBtn = screen.getByRole("button", { name: "Restore existing Pro purchase" });
    expect(restoreBtn).toBeInTheDocument();
  });

  it("renders trigger button with Pro Plan aria-label when user is pro", () => {
    setPro(true);
    render(<ProSettings />);
    const button = screen.getByRole("button", { name: "Pro Plan settings" });
    expect(button).toBeInTheDocument();
  });
});
