import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProSettings from "./ProSettings";
import * as proModule from "@/lib/pro";

describe("ProSettings", () => {
  it("renders trigger button with Subscription settings label when not Pro", () => {
    vi.spyOn(proModule, "isPro").mockReturnValue(false);
    vi.spyOn(proModule, "lookupsRemaining").mockReturnValue(10);

    render(<ProSettings />);

    const trigger = screen.getByRole("button", { name: "Subscription settings" });
    expect(trigger).toBeInTheDocument();
  });

  it("renders trigger button with Pro subscription settings label when Pro", () => {
    vi.spyOn(proModule, "isPro").mockReturnValue(true);

    render(<ProSettings />);

    const trigger = screen.getByRole("button", { name: "Pro subscription settings" });
    expect(trigger).toBeInTheDocument();
  });

  it("displays progressbar and plan details when dialog is opened for free tier", () => {
    vi.spyOn(proModule, "isPro").mockReturnValue(false);
    vi.spyOn(proModule, "lookupsRemaining").mockReturnValue(7);

    render(<ProSettings />);

    const trigger = screen.getByRole("button", { name: "Subscription settings" });
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Free Plan" })).toBeInTheDocument();

    const progressbar = screen.getByRole("progressbar", { name: "Remaining price lookups" });
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute("aria-valuenow", "7");
    expect(progressbar).toHaveAttribute("aria-valuemax", String(proModule.FREE_LIMIT));
  });
});
