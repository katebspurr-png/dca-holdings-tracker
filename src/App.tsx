import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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
import DemoEntry from "./pages/DemoEntry";
import NotFound from "./pages/NotFound";
import BottomTabBar from "./components/BottomTabBar";
import DemoOrAuthRoute from "./components/DemoOrAuthRoute";
import AppEducationalDisclaimer from "./components/AppEducationalDisclaimer";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DemoModeProvider, useDemoMode } from "./contexts/DemoModeContext";
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

const AppRoutes = () => {
  useInitTheme();
  return (
    <Routes>
      {/* Public */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/reset-password" element={<AuthResetPassword />} />
      <Route path="/demo" element={<DemoEntry />} />

      {/* Authenticated or active demo session */}
      <Route path="/" element={<DemoOrAuthRoute><Holdings /></DemoOrAuthRoute>} />
      <Route path="/holdings/:id" element={<DemoOrAuthRoute><HoldingDetail /></DemoOrAuthRoute>} />
      <Route path="/scenarios" element={<DemoOrAuthRoute><Scenarios /></DemoOrAuthRoute>} />
      <Route path="/scenarios/:id" element={<DemoOrAuthRoute><ScenarioDetail /></DemoOrAuthRoute>} />
      <Route path="/what-if" element={<DemoOrAuthRoute><WhatIfScenarios /></DemoOrAuthRoute>} />
      <Route path="/settings" element={<DemoOrAuthRoute><Settings /></DemoOrAuthRoute>} />
      <Route path="/update-prices" element={<DemoOrAuthRoute><UpdatePrices /></DemoOrAuthRoute>} />
      <Route path="/optimizer" element={<DemoOrAuthRoute><CapitalOptimizer /></DemoOrAuthRoute>} />
      <Route path="/progress" element={<DemoOrAuthRoute><Progress /></DemoOrAuthRoute>} />
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
                  <AppChrome />
                </SimFeesProvider>
              </ExperienceProvider>
            </DemoModeProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

function AppChrome() {
  const { session } = useAuth();
  const { isDemoMode } = useDemoMode();
  const { pathname } = useLocation();

  const onAuthFlow =
    pathname.startsWith("/auth") || pathname === "/demo";

  if (onAuthFlow) return null;
  if (!session && !isDemoMode) return null;

  return (
    <>
      <DemoModeBanner />
      <GuidedDemoCoach />
      <BottomTabBar />
    </>
  );
}

export default App;
