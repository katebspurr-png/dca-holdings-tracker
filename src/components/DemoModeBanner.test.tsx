import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DemoModeBanner from "./DemoModeBanner";

const mockNavigate = vi.fn();
const mockExitDemo = vi.fn();
const mockResetDemo = vi.fn();
const mockResetGuidedDemo = vi.fn();

let mockIsDemoMode = true;
let mockUser: unknown = null;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({
    isDemoMode: mockIsDemoMode,
    exitDemo: mockExitDemo,
    resetDemo: mockResetDemo,
  }),
}));

vi.mock("@/contexts/ExperienceContext", () => ({
  useExperience: () => ({
    resetGuidedDemo: mockResetGuidedDemo,
  }),
}));

describe("DemoModeBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDemoMode = true;
    mockUser = null;
  });

  it("renders banner text when in demo mode", () => {
    render(
      <MemoryRouter>
        <DemoModeBanner />
      </MemoryRouter>
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/exploring a demo portfolio/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create your own portfolio/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /restart walkthrough/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset demo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /exit demo/i })).toBeInTheDocument();
  });

  it("returns null when not in demo mode", () => {
    mockIsDemoMode = false;
    const { container } = render(
      <MemoryRouter>
        <DemoModeBanner />
      </MemoryRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  it("handles navigation to signup when unauthenticated user clicks 'Create your own portfolio'", () => {
    render(
      <MemoryRouter>
        <DemoModeBanner />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /create your own portfolio/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/auth?mode=signup");
  });

  it("handles exiting demo mode when authenticated user clicks 'View my portfolio'", () => {
    mockUser = { id: "user-123" };
    render(
      <MemoryRouter>
        <DemoModeBanner />
      </MemoryRouter>
    );

    const btn = screen.getByRole("button", { name: /view my portfolio/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);

    expect(mockExitDemo).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("calls resetGuidedDemo when 'Restart walkthrough' is clicked", () => {
    render(
      <MemoryRouter>
        <DemoModeBanner />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /restart walkthrough/i }));
    expect(mockResetGuidedDemo).toHaveBeenCalled();
  });

  it("calls resetDemo when 'Reset demo' is clicked", () => {
    render(
      <MemoryRouter>
        <DemoModeBanner />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /reset demo/i }));
    expect(mockResetDemo).toHaveBeenCalled();
  });

  it("calls exitDemo when 'Exit demo' is clicked", () => {
    render(
      <MemoryRouter>
        <DemoModeBanner />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /exit demo/i }));
    expect(mockExitDemo).toHaveBeenCalled();
  });
});
