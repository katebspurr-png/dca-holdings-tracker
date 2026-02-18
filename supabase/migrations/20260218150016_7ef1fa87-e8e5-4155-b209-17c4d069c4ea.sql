
ALTER TABLE public.holdings
  ADD COLUMN fee_type text NOT NULL DEFAULT 'flat',
  ADD COLUMN fee_value numeric NOT NULL DEFAULT 0;

-- Migrate existing fee data: treat current "fee" as flat fee_value
UPDATE public.holdings SET fee_type = 'flat', fee_value = fee;
