
CREATE TABLE public.holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  shares NUMERIC NOT NULL,
  avg_cost NUMERIC NOT NULL,
  fee NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to holdings"
  ON public.holdings
  FOR ALL
  USING (true)
  WITH CHECK (true);
