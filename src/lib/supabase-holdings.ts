import { supabase } from "@/integrations/supabase/client";

export type Holding = {
  id: string;
  ticker: string;
  shares: number;
  avg_cost: number;
  fee: number;
  created_at: string;
};

export async function fetchHoldings(): Promise<Holding[]> {
  const { data, error } = await supabase
    .from("holdings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Holding[];
}

export async function createHolding(holding: Omit<Holding, "id" | "created_at">) {
  const { data, error } = await supabase.from("holdings").insert(holding).select().single();
  if (error) throw error;
  return data as Holding;
}

export async function updateHolding(id: string, holding: Partial<Omit<Holding, "id" | "created_at">>) {
  const { data, error } = await supabase.from("holdings").update(holding).eq("id", id).select().single();
  if (error) throw error;
  return data as Holding;
}

export async function deleteHolding(id: string) {
  const { error } = await supabase.from("holdings").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchHolding(id: string): Promise<Holding> {
  const { data, error } = await supabase.from("holdings").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Holding;
}
