-- Allow one GC on multiple cases (parity with multi-case-per-IP).
-- Soft-deleted/archived cases previously still occupied the UNIQUE slot.
ALTER TABLE public.cases
  DROP CONSTRAINT IF EXISTS cases_surrogate_mother_surrogate_mothers_key;
