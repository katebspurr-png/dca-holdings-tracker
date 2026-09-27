import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PostWalkthroughConversionModal from "./PostWalkthroughConversionModal";

const mockNavigate = vi.fn();
const mockSettlePostWalkthroughConversion = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/contexts/ExperienceContext", () => ({
  useExperience: () => ({
    postWalkthroughConversionOpen: true,
    settlePostWalkthroughConversion: mockSettlePostWalkthroughConversion,
  }),
}));

describe("PostWalkthroughConversionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders conversion modal title and descriptions when open", () => {
    render(<PostWalkthroughConversionModal />);

    expect(screen.getByText("Ready to try with your own data?")).toBeInTheDocument();
    expect(
      screen.getByText(/You can save a real portfolio on this device and sync when you sign up/i)
    ).toBeInTheDocument();
  });

  it("renders buttons with focus-visible and active scale feedback classes", () => {
    render(<PostWalkthroughConversionModal />);

    const createBtn = screen.getByRole("button", { name: "Create account" });
    const exploreBtn = screen.getByRole("button", { name: "Keep exploring demo" });

    expect(createBtn).toHaveClass("focus-visible:ring-2");
    expect(createBtn).toHaveClass("active:scale-95");

    expect(exploreBtn).toHaveClass("focus-visible:ring-2");
    expect(exploreBtn).toHaveClass("active:scale-95");
  });

  it("settles conversion and navigates to signup when 'Create account' is clicked", () => {
    render(<PostWalkthroughConversionModal />);

    const createBtn = screen.getByRole("button", { name: "Create account" });
    fireEvent.click(createBtn);

    expect(mockSettlePostWalkthroughConversion).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/auth?mode=signup");
  });

  it("settles conversion when 'Keep exploring demo' is clicked", () => {
    render(<PostWalkthroughConversionModal />);

    const exploreBtn = screen.getByRole("button", { name: "Keep exploring demo" });
    fireEvent.click(exploreBtn);

    expect(mockSettlePostWalkthroughConversion).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
