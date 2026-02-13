
CREATE TABLE public.dca_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  holding_id UUID NOT NULL REFERENCES public.holdings(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  method TEXT NOT NULL,
  input1_label TEXT NOT NULL,
  input1_value NUMERIC NOT NULL,
  input2_label TEXT NOT NULL,
  input2_value NUMERIC NOT NULL,
  include_fees BOOLEAN NOT NULL,
  fee_amount NUMERIC NOT NULL,
  buy_price NUMERIC,
  shares_to_buy NUMERIC NOT NULL,
  budget_invested NUMERIC NOT NULL,
  fee_applied NUMERIC NOT NULL,
  total_spend NUMERIC NOT NULL,
  new_total_shares NUMERIC NOT NULL,
  new_avg_cost NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dca_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to dca_scenarios"
  ON public.dca_scenarios
  FOR ALL
  USING (true)
  WITH CHECK (true);
