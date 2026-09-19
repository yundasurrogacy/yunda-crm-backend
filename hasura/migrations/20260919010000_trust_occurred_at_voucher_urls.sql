-- 信托流水：业务发生时间（可手填）+ 一条流水可挂多张凭证
-- created_at 仍保留为「系统录入时间」的审计列，不覆盖。
--
-- 注意：本迁移**不删除**旧列 voucher_url，避免与灰度中的旧版本冲突。
--      待新版本全量上线后，再跑 20260919030000_drop_trust_voucher_url.sql 清理。
--
-- 应用方式（本项目 hasura 表里没有 schema_migrations，历史迁移都是直接执行的 SQL）：
--   HASURA_ADMIN_SECRET=xxx 用 /v2/query 的 run_sql 逐条执行；
--   执行后必须 POST /v1/metadata {"type":"reload_metadata"} 让新列进入 GraphQL schema。

-- 1) 业务发生/报销时间
ALTER TABLE public.trust_account_balance_changes
  ADD COLUMN IF NOT EXISTS occurred_at timestamptz;

UPDATE public.trust_account_balance_changes
  SET occurred_at = created_at
  WHERE occurred_at IS NULL;

ALTER TABLE public.trust_account_balance_changes
  ALTER COLUMN occurred_at SET DEFAULT now();
ALTER TABLE public.trust_account_balance_changes
  ALTER COLUMN occurred_at SET NOT NULL;

COMMENT ON COLUMN public.trust_account_balance_changes.occurred_at IS
  'Trust reimbursement / business occurrence time (manual, editable). created_at stays the audit of record creation.';

-- 2) 一条流水可挂多张凭证 / 收据（从旧的单值 voucher_url 回填）
ALTER TABLE public.trust_account_balance_changes
  ADD COLUMN IF NOT EXISTS voucher_urls text[] NOT NULL DEFAULT '{}';

UPDATE public.trust_account_balance_changes
  SET voucher_urls = ARRAY[voucher_url]
  WHERE voucher_url IS NOT NULL
    AND voucher_url <> ''
    AND voucher_urls = '{}';

COMMENT ON COLUMN public.trust_account_balance_changes.voucher_urls IS
  'Payment voucher / receipt file URLs (Qiniu); one or many per entry; no FK. Replaces the legacy single-value voucher_url.';
