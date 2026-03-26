import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import BottomTabBar from "./components/BottomTabBar";
import DemoOrAuthRoute from "./components/DemoOrAuthRoute";
import AppEducationalDisclaimer from "./components/AppEducationalDisclaimer";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DemoModeProvider, useDemoMode } from "./contexts/DemoModeContext";
import { ExperienceProvider } from "./contexts/ExperienceContext";
import { SimFeesProvider } from "./contexts/SimFeesContext";
import DemoModeBanner from "./components/DemoModeBanner";
import DemoModeWatermark from "./components/DemoModeWatermark";
import GuidedDemoCoach from "./components/GuidedDemoCoach";
import { Loader2 } from "lucide-react";

const Holdings = lazy(() => import("./pages/Holdings"));
const HoldingDetail = lazy(() => import("./pages/HoldingDetail"));
const Scenarios = lazy(() => import("./pages/Scenarios"));
const ScenarioDetail = lazy(() => import("./pages/ScenarioDetail"));
const WhatIfScenarios = lazy(() => import("./pages/WhatIfScenarios"));
const Settings = lazy(() => import("./pages/Settings"));
const UpdatePrices = lazy(() => import("./pages/UpdatePrices"));
const CapitalOptimizer = lazy(() => import("./pages/CapitalOptimizer"));
const Progress = lazy(() => import("./pages/Progress"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AuthResetPassword = lazy(() => import("./pages/AuthResetPassword"));
const DemoEntry = lazy(() => import("./pages/DemoEntry"));
const DemoWelcome = lazy(() => import("./pages/DemoWelcome"));
const NotFound = lazy(() => import("./pages/NotFound"));

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

const routeFallback = (
  <div className="flex min-h-[40vh] items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
  </div>
);

const AppRoutes = () => {
  useInitTheme();
  return (
    <Suspense fallback={routeFallback}>
    <Routes>
      {/* Public */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/reset-password" element={<AuthResetPassword />} />
      <Route path="/demo-welcome" element={<DemoWelcome />} />
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
    </Suspense>
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
    pathname.startsWith("/auth") || pathname === "/demo" || pathname === "/demo-welcome";

  if (onAuthFlow) return null;
  if (!session && !isDemoMode) return null;

  return (
    <>
      <DemoModeWatermark />
      <DemoModeBanner />
      <GuidedDemoCoach />
      <BottomTabBar />
    </>
  );
}

export default App;
