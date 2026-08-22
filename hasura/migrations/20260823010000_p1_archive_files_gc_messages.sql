-- P1 CRM additive schema (applied 2026-08-23 via Hasura run_sql)
-- Soft archive
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

-- File client visibility
ALTER TABLE public.cases_files ADD COLUMN IF NOT EXISTS visibility text NULL DEFAULT 'manager';

-- GC swap audit (actor = role + business entity; no FK to users)
CREATE TABLE IF NOT EXISTS public.case_gc_history (
  id bigserial PRIMARY KEY,
  case_cases bigint NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  from_surrogate_mother bigint NULL REFERENCES public.surrogate_mothers(id) ON DELETE SET NULL,
  to_surrogate_mother bigint NULL REFERENCES public.surrogate_mothers(id) ON DELETE SET NULL,
  changed_by_role text NULL,
  changed_by_entity_id bigint NULL,
  changed_by_label text NULL,
  remark text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Case messaging (author = role + business entity; no FK to users)
CREATE TABLE IF NOT EXISTS public.case_messages (
  id bigserial PRIMARY KEY,
  case_cases bigint NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  author_role text NOT NULL,
  author_entity_id bigint NULL,
  author_label text NULL,
  body text NOT NULL,
  email_notify boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
