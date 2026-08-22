-- 案例经理业务邮箱：未绑登录时也可识别/搜索；与 IP/GC 建档一致。
ALTER TABLE public.case_managers
  ADD COLUMN IF NOT EXISTS email text;

-- 已绑定用户的行：用登录邮箱回填
UPDATE public.case_managers cm
SET email = lower(trim(u.email))
FROM public.users u
WHERE cm.user_users = u.id
  AND u.email IS NOT NULL
  AND trim(u.email) <> ''
  AND (cm.email IS NULL OR trim(cm.email) = '');

-- 邮箱唯一（允许多行 email 为空，兼容历史未绑数据）
CREATE UNIQUE INDEX IF NOT EXISTS case_managers_email_key
  ON public.case_managers (lower(email))
  WHERE email IS NOT NULL AND trim(email) <> '';

COMMENT ON COLUMN public.case_managers.email IS '业务联系邮箱；建档时填写，绑定登录后可与 users.email 对齐';
