import { useEffect, useState, useCallback, useRef } from "react";
import { Moon, Sun, Download, Upload, RotateCcw, Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { resetAll, exportData, importData } from "@/lib/storage";
import { ENABLE_LOOKUP_LIMIT } from "@/lib/pro";
import ProSettings from "@/components/ProSettings";
import { toast } from "sonner";
import { getUserPlan, getActivePlan, setUserPlan, isPremium, type PlanType } from "@/lib/feature-access";

export default function Settings() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const handleExport = useCallback(() => {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dca-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported");
  }, []);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importData(reader.result as string);
        toast.success("Data imported");
      } catch {
        toast.error("Invalid backup file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handleReset = useCallback(() => {
    resetAll();
    toast.success("Reset to demo data");
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Appearance */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Appearance</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {dark ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
              <Label htmlFor="dark-mode" className="cursor-pointer text-sm font-medium">
                Dark Mode
              </Label>
            </div>
            <Switch id="dark-mode" checked={dark} onCheckedChange={setDark} />
          </div>
        </div>

        {/* Data Management */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Data</h2>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExport} size="sm" variant="outline">
              <Download className="mr-1.5 h-4 w-4" />
              Export Data
            </Button>
            <Button onClick={() => fileRef.current?.click()} size="sm" variant="outline">
              <Upload className="mr-1.5 h-4 w-4" />
              Import Data
            </Button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
          <div className="border-t border-border pt-4">
            <Button onClick={handleReset} size="sm" variant="destructive">
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset to Demo Data
            </Button>
          </div>
        </div>

        {/* Pro Settings */}
        {ENABLE_LOOKUP_LIMIT && (
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Plan</h2>
            <ProSettings />
          </div>
        )}

        {/* About */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">About</h2>
          <p className="text-sm text-muted-foreground">DCA Down · v1.0.0</p>
        </div>
      </main>
    </div>
  );
}
