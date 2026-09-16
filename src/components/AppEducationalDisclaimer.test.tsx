import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AppEducationalDisclaimer from "./AppEducationalDisclaimer";

// Mock the AuthContext hook
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";

describe("AppEducationalDisclaimer", () => {
  it("renders nothing when there is no session", () => {
    vi.mocked(useAuth).mockReturnValue({ session: null } as ReturnType<typeof useAuth>);
    const { container } = render(<AppEducationalDisclaimer />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the educational disclaimer when session exists", () => {
    vi.mocked(useAuth).mockReturnValue({ session: { user: { id: "123" } } } as unknown as ReturnType<typeof useAuth>);
    render(<AppEducationalDisclaimer />);

    const disclaimer = screen.getByRole("note");
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer).toHaveTextContent(
      "PositionPilot models average-cost outcomes from your inputs. It is not financial advice and does not recommend securities."
    );
  });
});
