import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Holdings from "./pages/Holdings";
import HoldingDetail from "./pages/HoldingDetail";
import Scenarios from "./pages/Scenarios";
import ScenarioDetail from "./pages/ScenarioDetail";
import WhatIfScenarios from "./pages/WhatIfScenarios";
import Settings from "./pages/Settings";
import UpdatePrices from "./pages/UpdatePrices";
import CapitalOptimizer from "./pages/CapitalOptimizer";
import Progress from "./pages/Progress";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import AuthResetPassword from "./pages/AuthResetPassword";
import NotFound from "./pages/NotFound";
import BottomTabBar from "./components/BottomTabBar";
import AppEducationalDisclaimer from "./components/AppEducationalDisclaimer";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DemoModeProvider } from "./contexts/DemoModeContext";
import { ExperienceProvider } from "./contexts/ExperienceContext";
import { SimFeesProvider } from "./contexts/SimFeesContext";
import DemoModeBanner from "./components/DemoModeBanner";
import GuidedDemoCoach from "./components/GuidedDemoCoach";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function useInitTheme() {
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, []);
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[max(884px,100dvh)] items-center justify-center bg-stitch-bg">
        <Loader2 className="h-6 w-6 animate-spin text-stitch-accent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => {
  useInitTheme();
  return (
    <Routes>
      {/* Public */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/reset-password" element={<AuthResetPassword />} />

      {/* Protected */}
      <Route path="/" element={<ProtectedRoute><Holdings /></ProtectedRoute>} />
      <Route path="/holdings/:id" element={<ProtectedRoute><HoldingDetail /></ProtectedRoute>} />
      <Route path="/scenarios" element={<ProtectedRoute><Scenarios /></ProtectedRoute>} />
      <Route path="/scenarios/:id" element={<ProtectedRoute><ScenarioDetail /></ProtectedRoute>} />
      <Route path="/what-if" element={<ProtectedRoute><WhatIfScenarios /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/update-prices" element={<ProtectedRoute><UpdatePrices /></ProtectedRoute>} />
      <Route path="/optimizer" element={<ProtectedRoute><CapitalOptimizer /></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <DemoModeProvider>
              <ExperienceProvider>
                <SimFeesProvider>
                  <AppRoutes />
                  <AppEducationalDisclaimer />
                  <AuthenticatedChrome />
                </SimFeesProvider>
              </ExperienceProvider>
            </DemoModeProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

function AuthenticatedChrome() {
  const { session } = useAuth();
  if (!session) return null;
  return (
    <>
      <DemoModeBanner />
      <GuidedDemoCoach />
      <BottomTabBar />
    </>
  );
}

export default App;
