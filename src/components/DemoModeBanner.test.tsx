import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DemoModeBanner from "./DemoModeBanner";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

let mockUser: { id: string; email: string } | null = null;
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

let mockIsDemoMode = true;
const mockExitDemo = vi.fn();
const mockResetDemo = vi.fn();
vi.mock("@/contexts/DemoModeContext", () => ({
  useDemoMode: () => ({
    isDemoMode: mockIsDemoMode,
    exitDemo: mockExitDemo,
    resetDemo: mockResetDemo,
  }),
}));

const mockResetGuidedDemo = vi.fn();
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

  it("renders banner and buttons when in demo mode for guest user", () => {
    render(<DemoModeBanner />);

    expect(screen.getByRole("status", { name: "Demo mode status" })).toBeInTheDocument();
    expect(screen.getByText("You're exploring a demo portfolio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create your own portfolio" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restart walkthrough" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset demo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exit demo" })).toBeInTheDocument();
  });

  it("navigates to signup when clicking create portfolio as guest", () => {
    render(<DemoModeBanner />);

    fireEvent.click(screen.getByRole("button", { name: "Create your own portfolio" }));
    expect(mockNavigate).toHaveBeenCalledWith("/auth?mode=signup");
  });

  it("exits demo and navigates home when clicking view portfolio as logged-in user", () => {
    mockUser = { id: "123", email: "test@example.com" };
    render(<DemoModeBanner />);

    expect(screen.getByRole("button", { name: "View my portfolio" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View my portfolio" }));
    expect(mockExitDemo).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("navigates to login when clicking sign in button", () => {
    render(<DemoModeBanner />);

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(mockNavigate).toHaveBeenCalledWith("/auth?mode=login");
  });

  it("calls resetGuidedDemo when clicking restart walkthrough", () => {
    render(<DemoModeBanner />);

    fireEvent.click(screen.getByRole("button", { name: "Restart walkthrough" }));
    expect(mockResetGuidedDemo).toHaveBeenCalled();
  });

  it("calls resetDemo when clicking reset demo", () => {
    render(<DemoModeBanner />);

    fireEvent.click(screen.getByRole("button", { name: "Reset demo" }));
    expect(mockResetDemo).toHaveBeenCalled();
  });

  it("calls exitDemo when clicking exit demo", () => {
    render(<DemoModeBanner />);

    fireEvent.click(screen.getByRole("button", { name: "Exit demo" }));
    expect(mockExitDemo).toHaveBeenCalled();
  });
});
