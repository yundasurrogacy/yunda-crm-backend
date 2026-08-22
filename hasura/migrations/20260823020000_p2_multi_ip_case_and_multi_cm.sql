-- P2: multi-case per IP + multi CM via M2M
ALTER TABLE public.cases DROP CONSTRAINT IF EXISTS cases_intended_parent_intended_parents_key;

CREATE TABLE IF NOT EXISTS public.case_case_managers (
  id bigserial PRIMARY KEY,
  case_cases bigint NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  case_manager_case_managers bigint NOT NULL REFERENCES public.case_managers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_cases, case_manager_case_managers)
);

INSERT INTO public.case_case_managers (case_cases, case_manager_case_managers)
SELECT c.id, c.case_manager_case_managers
FROM public.cases c
WHERE c.case_manager_case_managers IS NOT NULL
ON CONFLICT (case_cases, case_manager_case_managers) DO NOTHING;

-- Keep cases_surrogate_mother_surrogate_mothers_key UNIQUE (one GC ↔ one active case).
-- Superseded by 20260823070000_drop_gc_case_unique.sql (one GC may appear on multiple cases).
