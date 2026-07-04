-- AP2: track Brevo sync state for public leads.
-- Idempotent and safe for existing environments.

ALTER TABLE public.public_leads
  ADD COLUMN IF NOT EXISTS synced_to_brevo_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_public_leads_unsynced_to_brevo
  ON public.public_leads (synced_to_brevo_at)
  WHERE synced_to_brevo_at IS NULL;
