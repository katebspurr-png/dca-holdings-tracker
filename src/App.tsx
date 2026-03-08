import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Holdings from "./pages/Holdings";
import DcaCalculator from "./pages/DcaCalculator";
import HoldingDetail from "./pages/HoldingDetail";
import Scenarios from "./pages/Scenarios";
import ScenarioDetail from "./pages/ScenarioDetail";
import WhatIfScenarios from "./pages/WhatIfScenarios";
import Settings from "./pages/Settings";
import UpdatePrices from "./pages/UpdatePrices";
import CapitalOptimizer from "./pages/CapitalOptimizer";
import NotFound from "./pages/NotFound";
import BottomTabBar from "./components/BottomTabBar";

const queryClient = new QueryClient();

function useInitTheme() {
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (stored === "dark" || (!stored && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  }, []);
}

const App = () => {
  useInitTheme();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Holdings />} />
          <Route path="/holdings/:id" element={<HoldingDetail />} />
          <Route path="/holdings/:id/dca" element={<DcaCalculator />} />
          <Route path="/scenarios" element={<Scenarios />} />
          <Route path="/scenarios/:id" element={<ScenarioDetail />} />
          <Route path="/what-if" element={<WhatIfScenarios />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/update-prices" element={<UpdatePrices />} />
          <Route path="/optimizer" element={<CapitalOptimizer />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomTabBar />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
