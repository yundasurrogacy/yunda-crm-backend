-- Drop legacy portal tables that the new CRM does not read.
-- cases.client_manager_client_managers and cases_files.journey_journeys
-- only pointed at those old tables.

ALTER TABLE public.cases
  DROP CONSTRAINT IF EXISTS cases_client_manager_client_managers_fkey;

ALTER TABLE public.cases
  DROP COLUMN IF EXISTS client_manager_client_managers;

ALTER TABLE public.cases_files
  DROP CONSTRAINT IF EXISTS cases_files_journey_journeys_fkey;

ALTER TABLE public.cases_files
  DROP COLUMN IF EXISTS journey_journeys;

DROP TABLE IF EXISTS public.post_comments;
DROP TABLE IF EXISTS public.posts;
DROP TABLE IF EXISTS public.journeys;
DROP TABLE IF EXISTS public.ivf_clinics;
DROP TABLE IF EXISTS public.client_managers;
