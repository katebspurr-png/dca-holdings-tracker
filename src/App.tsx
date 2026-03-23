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
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import BottomTabBar from "./components/BottomTabBar";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
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

      {/* Protected */}
      <Route path="/" element={<ProtectedRoute><Holdings /></ProtectedRoute>} />
      <Route path="/holdings/:id" element={<ProtectedRoute><HoldingDetail /></ProtectedRoute>} />
      <Route path="/scenarios" element={<ProtectedRoute><Scenarios /></ProtectedRoute>} />
      <Route path="/scenarios/:id" element={<ProtectedRoute><ScenarioDetail /></ProtectedRoute>} />
      <Route path="/what-if" element={<ProtectedRoute><WhatIfScenarios /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/update-prices" element={<ProtectedRoute><UpdatePrices /></ProtectedRoute>} />
      <Route path="/optimizer" element={<ProtectedRoute><CapitalOptimizer /></ProtectedRoute>} />
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
            <AppRoutes />
            <BottomTabBarGuard />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

// Only show the tab bar when authenticated
function BottomTabBarGuard() {
  const { session } = useAuth();
  if (!session) return null;
  return <BottomTabBar />;
}

export default App;
