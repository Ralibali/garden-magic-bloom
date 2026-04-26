-- If public_leads already exists from an earlier migration, expand accepted sources.
alter table public.public_leads
  drop constraint if exists public_leads_source_check;

alter table public.public_leads
  add constraint public_leads_source_check
  check (source in ('sakalender', 'odlingsplan', 'odlingsakuten', 'gro-preview', 'blogg', 'seo'));
