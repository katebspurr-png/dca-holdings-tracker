-- ============================================================
-- PositionPilot — Full schema migration
-- Adds user ownership, missing fields, and all missing tables
-- ============================================================

-- ── 1. Holdings: add missing columns ────────────────────────

ALTER TABLE public.holdings
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS exchange TEXT NOT NULL DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS initial_avg_cost NUMERIC;

-- Backfill initial_avg_cost from avg_cost for existing rows
UPDATE public.holdings SET initial_avg_cost = avg_cost WHERE initial_avg_cost IS NULL;
ALTER TABLE public.holdings ALTER COLUMN initial_avg_cost SET NOT NULL;

-- ── 2. Fix RLS: drop open policies, add user-scoped ones ────

DROP POLICY IF EXISTS "Allow all access to holdings" ON public.holdings;
DROP POLICY IF EXISTS "Allow all access to dca_scenarios" ON public.dca_scenarios;

CREATE POLICY "Users can manage own holdings"
  ON public.holdings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own scenarios"
  ON public.dca_scenarios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.holdings
      WHERE holdings.id = dca_scenarios.holding_id
        AND holdings.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.holdings
      WHERE holdings.id = dca_scenarios.holding_id
        AND holdings.user_id = auth.uid()
    )
  );

-- ── 3. Transactions table ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  holding_id UUID NOT NULL REFERENCES public.holdings(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'buy',
  buy_price NUMERIC NOT NULL,
  shares_bought NUMERIC NOT NULL,
  budget_invested NUMERIC NOT NULL,
  fee_applied NUMERIC NOT NULL DEFAULT 0,
  total_spend NUMERIC NOT NULL,
  include_fees BOOLEAN NOT NULL DEFAULT false,
  fee_type_snapshot TEXT NOT NULL DEFAULT 'flat',
  fee_value_snapshot NUMERIC NOT NULL DEFAULT 0,
  previous_shares NUMERIC NOT NULL,
  previous_avg_cost NUMERIC NOT NULL,
  new_total_shares NUMERIC NOT NULL,
  new_avg_cost NUMERIC NOT NULL,
  method TEXT NOT NULL,
  notes TEXT,
  is_undone BOOLEAN NOT NULL DEFAULT false,
  undone_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transactions"
  ON public.transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.holdings
      WHERE holdings.id = transactions.holding_id
        AND holdings.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.holdings
      WHERE holdings.id = transactions.holding_id
        AND holdings.user_id = auth.uid()
    )
  );

-- ── 4. What-if comparisons table ────────────────────────────

CREATE TABLE IF NOT EXISTS public.what_if_comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_budget NUMERIC NOT NULL,
  scenarios JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.what_if_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own what-if comparisons"
  ON public.what_if_comparisons FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 5. Optimization scenarios table ─────────────────────────

CREATE TABLE IF NOT EXISTS public.optimization_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_budget NUMERIC NOT NULL,
  include_fees BOOLEAN NOT NULL DEFAULT false,
  optimization_mode TEXT NOT NULL,
  selected_holdings_json TEXT NOT NULL DEFAULT '[]',
  allocation_results_json TEXT NOT NULL DEFAULT '[]',
  projected_portfolio_avg NUMERIC NOT NULL DEFAULT 0,
  total_fees NUMERIC NOT NULL DEFAULT 0,
  total_spend NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.optimization_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own optimization scenarios"
  ON public.optimization_scenarios FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
