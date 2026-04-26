-- Public lead capture for /sakalender and /odlingsplan
create table if not exists public.public_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null check (source in ('sakalender', 'odlingsplan', 'odlingsakuten', 'gro-preview', 'blogg', 'seo')),
  plan jsonb,
  page_path text,
  user_agent text,
  consent_marketing boolean not null default true,
  created_at timestamptz not null default now(),
  converted_user_id uuid references auth.users(id) on delete set null,
  converted_at timestamptz
);

create index if not exists public_leads_email_idx on public.public_leads (lower(email));
create index if not exists public_leads_source_idx on public.public_leads (source);
create index if not exists public_leads_created_at_idx on public.public_leads (created_at desc);

alter table public.public_leads enable row level security;

-- Visitors must be able to submit a lead from the public website.
drop policy if exists "Anyone can submit public leads" on public.public_leads;
create policy "Anyone can submit public leads"
  on public.public_leads
  for insert
  to anon, authenticated
  with check (
    email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    and source in ('sakalender', 'odlingsplan', 'odlingsakuten', 'gro-preview', 'blogg', 'seo')
  );

-- Keep lead data private. Admin/service-role can still read it outside RLS.
drop policy if exists "Authenticated users cannot read public leads" on public.public_leads;
create policy "Authenticated users cannot read public leads"
  on public.public_leads
  for select
  to authenticated
  using (false);

comment on table public.public_leads is 'Leads captured from public growth tools before account creation.';
