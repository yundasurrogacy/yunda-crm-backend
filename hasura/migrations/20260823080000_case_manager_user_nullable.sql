-- 细节-5：账号可解绑业务主体。case_managers.user_users 原先 NOT NULL，无法清空绑定。
ALTER TABLE public.case_managers
  ALTER COLUMN user_users DROP NOT NULL;
