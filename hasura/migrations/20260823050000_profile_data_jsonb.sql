-- profile_data must be jsonb for Hasura _contains (CM-created party ownership meta)
ALTER TABLE public.intended_parents
  ALTER COLUMN profile_data TYPE jsonb USING COALESCE(profile_data, '{}'::json)::jsonb;
ALTER TABLE public.surrogate_mothers
  ALTER COLUMN profile_data TYPE jsonb USING COALESCE(profile_data, '{}'::json)::jsonb;
