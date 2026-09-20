import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DemoModeBanner from "./DemoModeBanner";

const mockNavigate = vi.fn();
const mockExitDemo = vi.fn();
const mockResetDemo = vi.fn();
const mockResetGuidedDemo = vi.fn();

let mockUser: { id: string } | null = null;
let mockIsDemoMode = true;

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

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
    mockUser = null;
    mockIsDemoMode = true;
  });

  it("renders nothing when isDemoMode is false", () => {
    mockIsDemoMode = false;
    const { container } = render(<DemoModeBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders demo mode banner with accessible role and aria-label", () => {
    render(<DemoModeBanner />);

    const banner = screen.getByRole("status");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute("aria-label", "Demo mode status and actions");
  });

  it("renders action buttons when unauthenticated", () => {
    render(<DemoModeBanner />);

    const createBtn = screen.getByRole("button", { name: "Create your own portfolio" });
    expect(createBtn).toBeInTheDocument();

    const signInBtn = screen.getByRole("button", { name: "Sign in to your account" });
    expect(signInBtn).toBeInTheDocument();

    const restartBtn = screen.getByRole("button", { name: "Restart walkthrough" });
    expect(restartBtn).toBeInTheDocument();

    const resetBtn = screen.getByRole("button", { name: "Reset demo" });
    expect(resetBtn).toBeInTheDocument();

    const exitBtn = screen.getByRole("button", { name: "Exit demo" });
    expect(exitBtn).toBeInTheDocument();
  });

  it("calls appropriate action handlers when clicked", () => {
    render(<DemoModeBanner />);

    fireEvent.click(screen.getByRole("button", { name: "Create your own portfolio" }));
    expect(mockNavigate).toHaveBeenCalledWith("/auth?mode=signup");

    fireEvent.click(screen.getByRole("button", { name: "Sign in to your account" }));
    expect(mockNavigate).toHaveBeenCalledWith("/auth?mode=login");

    fireEvent.click(screen.getByRole("button", { name: "Restart walkthrough" }));
    expect(mockResetGuidedDemo).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Reset demo" }));
    expect(mockResetDemo).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Exit demo" }));
    expect(mockExitDemo).toHaveBeenCalled();
  });

  it("renders 'View my portfolio' and exits demo when authenticated user clicks main button", () => {
    mockUser = { id: "user_123" };
    render(<DemoModeBanner />);

    const mainBtn = screen.getByRole("button", { name: "View my portfolio" });
    expect(mainBtn).toBeInTheDocument();

    fireEvent.click(mainBtn);
    expect(mockExitDemo).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });
});
