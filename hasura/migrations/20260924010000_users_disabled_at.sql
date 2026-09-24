-- 账号「停用登录」：不删数据，只禁止登录。
--
-- 背景：users 被 5 个外键以 ON DELETE RESTRICT 引用（case_managers /
-- intended_parents / surrogate_mothers / cases.created_by / client_managers），
-- 全库 56 个账号里只有 2 个能真正硬删除，且删除会破坏 cases.created_by 的审计。
-- 因此用 disabled_at 表达「停用」：可逆、不动数据、不破坏审计。
--
-- 注意：软删除语义上有别于实体软删除（deleted_at）。这里只影响登录与访问，
-- 不影响任何业务档案与案例归属。

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

COMMENT ON COLUMN users.disabled_at IS
  '非空表示该登录账号已停用：禁止登录，且进行中的会话立即失效。可置空恢复。';

-- 会话校验按主键 users_by_pk 查询，已有主键索引，无需额外索引。
-- 「还剩几个可用管理员」之类的统计是低频操作，数据量小，全表扫描即可。
