-- Soft-delete for party / case-manager entities (cases already use archived_at).
ALTER TABLE public.intended_parents
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
COMMENT ON COLUMN public.intended_parents.deleted_at IS
  'Soft delete timestamp; NULL means active. Data retained permanently.';

ALTER TABLE public.surrogate_mothers
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
COMMENT ON COLUMN public.surrogate_mothers.deleted_at IS
  'Soft delete timestamp; NULL means active. Data retained permanently.';

ALTER TABLE public.case_managers
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
COMMENT ON COLUMN public.case_managers.deleted_at IS
  'Soft delete timestamp; NULL means active. Data retained permanently.';

CREATE INDEX IF NOT EXISTS intended_parents_deleted_at_idx
  ON public.intended_parents (deleted_at);
CREATE INDEX IF NOT EXISTS surrogate_mothers_deleted_at_idx
  ON public.surrogate_mothers (deleted_at);
CREATE INDEX IF NOT EXISTS case_managers_deleted_at_idx
  ON public.case_managers (deleted_at);
