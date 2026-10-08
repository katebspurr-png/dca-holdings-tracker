import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "./NotFound";

describe("NotFound Page", () => {
  it("renders 404 header and descriptive text inside main landmark", () => {
    render(
      <MemoryRouter initialEntries={["/non-existent-page"]}>
        <NotFound />
      </MemoryRouter>
    );

    const mainLandmark = screen.getByRole("main");
    expect(mainLandmark).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 1, name: "404" })).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(
      screen.getByText("The page you are looking for doesn't exist or has been moved.")
    ).toBeInTheDocument();
  });

  it("renders accessible return link with proper aria-label and destination", () => {
    render(
      <MemoryRouter initialEntries={["/non-existent-page"]}>
        <NotFound />
      </MemoryRouter>
    );

    const returnLink = screen.getByRole("link", { name: "Return to portfolio overview" });
    expect(returnLink).toBeInTheDocument();
    expect(returnLink).toHaveAttribute("href", "/");
  });
});
