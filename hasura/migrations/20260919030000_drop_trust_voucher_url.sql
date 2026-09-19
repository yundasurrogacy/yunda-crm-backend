-- 清理旧的单值凭证列（数据已迁到 voucher_urls，见 20260919010000）。
-- 仅在新版本 CRM 全量上线后执行，避免灰度期旧代码读不到列。

ALTER TABLE public.trust_account_balance_changes
  DROP COLUMN IF EXISTS voucher_url;
