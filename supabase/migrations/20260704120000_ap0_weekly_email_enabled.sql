-- AP0: weekly email opt-in preference used by digest/unsubscribe flows.
-- Idempotent for existing environments and safe if the column was added manually.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weekly_email_enabled boolean;

UPDATE public.profiles
SET weekly_email_enabled = true
WHERE weekly_email_enabled IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN weekly_email_enabled SET DEFAULT true,
  ALTER COLUMN weekly_email_enabled SET NOT NULL;
