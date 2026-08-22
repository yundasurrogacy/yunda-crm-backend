ALTER TABLE public.trust_account_balance_changes
  ADD COLUMN IF NOT EXISTS voucher_url text NULL;
COMMENT ON COLUMN public.trust_account_balance_changes.voucher_url IS
  'Payment voucher / receipt file URL (Qiniu); no FK';
