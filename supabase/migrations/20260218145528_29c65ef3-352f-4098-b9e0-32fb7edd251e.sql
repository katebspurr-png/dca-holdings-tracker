
ALTER TABLE public.dca_scenarios
  ADD COLUMN recommended_target numeric,
  ADD COLUMN budget_percent_used numeric;
