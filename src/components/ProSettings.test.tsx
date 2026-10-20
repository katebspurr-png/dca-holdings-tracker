import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProSettings from "./ProSettings";
import * as proModule from "@/lib/pro";

vi.mock("@/lib/pro", () => ({
  isPro: vi.fn(),
  setPro: vi.fn(),
  lookupsRemaining: vi.fn(),
  FREE_LIMIT: 5,
}));

describe("ProSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders free plan status, accessibility attributes, and focus styles", () => {
    vi.mocked(proModule.isPro).mockReturnValue(false);
    vi.mocked(proModule.lookupsRemaining).mockReturnValue(3);

    render(<ProSettings />);

    const triggerBtn = screen.getByRole("button", { name: "Plan & usage settings" });
    expect(triggerBtn).toBeInTheDocument();
    expect(triggerBtn.className).toContain("focus-visible:ring-2");

    fireEvent.click(triggerBtn);

    expect(screen.getByRole("heading", { name: "Free Plan" })).toBeInTheDocument();
    expect(screen.getByText("3 of 5 price lookups remaining today")).toBeInTheDocument();

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "2");
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "5");
    expect(progressbar).toHaveAttribute("aria-label", "Daily price lookups usage");
  });

  it("renders pro plan status when user is pro", () => {
    vi.mocked(proModule.isPro).mockReturnValue(true);
    vi.mocked(proModule.lookupsRemaining).mockReturnValue(5);

    render(<ProSettings />);

    const triggerBtn = screen.getByRole("button", { name: "Pro Plan status" });
    expect(triggerBtn).toBeInTheDocument();

    fireEvent.click(triggerBtn);

    expect(screen.getByText("Unlimited price lookups")).toBeInTheDocument();
  });

  it("handles upgrade action correctly", () => {
    vi.mocked(proModule.isPro).mockReturnValue(false);
    vi.mocked(proModule.lookupsRemaining).mockReturnValue(1);
    const onChanged = vi.fn();

    render(<ProSettings onChanged={onChanged} />);

    fireEvent.click(screen.getByRole("button", { name: "Plan & usage settings" }));

    const upgradeBtn = screen.getByRole("button", { name: /Upgrade to Pro/i });
    expect(upgradeBtn.className).toContain("focus-visible:ring-2");
    expect(upgradeBtn.className).toContain("active:scale-95");

    fireEvent.click(upgradeBtn);

    expect(proModule.setPro).toHaveBeenCalledWith(true);
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});
