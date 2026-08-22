-- Audit actors: drop FK to users; store portal role + business entity + label snapshot.
-- Safe when case_gc_history / case_messages rows are empty or after backfill.

ALTER TABLE public.case_gc_history DROP CONSTRAINT IF EXISTS case_gc_history_changed_by_users_fkey;
ALTER TABLE public.case_gc_history DROP COLUMN IF EXISTS changed_by_users;
ALTER TABLE public.case_gc_history ADD COLUMN IF NOT EXISTS changed_by_role text NULL;
ALTER TABLE public.case_gc_history ADD COLUMN IF NOT EXISTS changed_by_entity_id bigint NULL;
ALTER TABLE public.case_gc_history ADD COLUMN IF NOT EXISTS changed_by_label text NULL;

ALTER TABLE public.case_messages DROP CONSTRAINT IF EXISTS case_messages_author_users_fkey;
ALTER TABLE public.case_messages DROP COLUMN IF EXISTS author_users;
ALTER TABLE public.case_messages ADD COLUMN IF NOT EXISTS author_entity_id bigint NULL;
ALTER TABLE public.case_messages ADD COLUMN IF NOT EXISTS author_label text NULL;
