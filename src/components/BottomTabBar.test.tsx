import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import BottomTabBar from "./BottomTabBar";
import { MemoryRouter, useNavigate } from "react-router-dom";

const mockedNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe("BottomTabBar component", () => {
  it("renders navigation tab items with accessible labels and aria-current", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const portfolioBtn = screen.getByRole("button", { name: "Portfolio" });
    const budgetBtn = screen.getByRole("button", { name: "Budget lab" });
    const progressBtn = screen.getByRole("button", { name: "Progress" });
    const settingsBtn = screen.getByRole("button", { name: "Settings" });

    expect(portfolioBtn).toBeInTheDocument();
    expect(budgetBtn).toBeInTheDocument();
    expect(progressBtn).toBeInTheDocument();
    expect(settingsBtn).toBeInTheDocument();

    expect(portfolioBtn).toHaveAttribute("aria-current", "page");
    expect(budgetBtn).not.toHaveAttribute("aria-current");
    expect(progressBtn).not.toHaveAttribute("aria-current");
    expect(settingsBtn).not.toHaveAttribute("aria-current");
  });

  it("navigates to corresponding tab when clicked", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomTabBar />
      </MemoryRouter>
    );

    const budgetBtn = screen.getByRole("button", { name: "Budget lab" });
    fireEvent.click(budgetBtn);
    expect(mockedNavigate).toHaveBeenCalledWith("/optimizer");
  });
});
