import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PostWalkthroughConversionModal from "./PostWalkthroughConversionModal";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const mockSettle = vi.fn();
vi.mock("@/contexts/ExperienceContext", () => ({
  useExperience: () => ({
    postWalkthroughConversionOpen: true,
    settlePostWalkthroughConversion: mockSettle,
  }),
}));

describe("PostWalkthroughConversionModal", () => {
  it("renders conversion modal elements correctly", () => {
    render(<PostWalkthroughConversionModal />);

    expect(screen.getByRole("heading", { name: /Ready to try with your own data\?/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create account/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Keep exploring demo/i })).toBeInTheDocument();
  });

  it("navigates to signup on create account click", () => {
    render(<PostWalkthroughConversionModal />);

    const createAccountBtn = screen.getByRole("button", { name: /Create account/i });
    fireEvent.click(createAccountBtn);

    expect(mockSettle).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/auth?mode=signup");
  });

  it("settles modal on keep exploring click", () => {
    mockSettle.mockClear();
    render(<PostWalkthroughConversionModal />);

    const keepExploringBtn = screen.getByRole("button", { name: /Keep exploring demo/i });
    fireEvent.click(keepExploringBtn);

    expect(mockSettle).toHaveBeenCalled();
  });
});
