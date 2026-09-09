import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PostWalkthroughConversionModal from "./PostWalkthroughConversionModal";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

const mockSettle = vi.fn();

vi.mock("@/contexts/ExperienceContext", () => ({
  useExperience: () => ({
    postWalkthroughConversionOpen: true,
    settlePostWalkthroughConversion: mockSettle,
  }),
}));

describe("PostWalkthroughConversionModal", () => {
  it("renders buttons with WCAG accessible labels and focus ring styles", () => {
    render(<PostWalkthroughConversionModal />);

    const createBtn = screen.getByRole("button", { name: "Create account to save your real portfolio" });
    const exploreBtn = screen.getByRole("button", { name: "Keep exploring demo mode" });

    expect(createBtn).toBeInTheDocument();
    expect(exploreBtn).toBeInTheDocument();

    expect(createBtn).toHaveClass("focus-visible:ring-2");
    expect(exploreBtn).toHaveClass("focus-visible:ring-2");
  });
});
