-- Lightweight first-party analytics for conversion tracking
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  anonymous_id text,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  page_path text,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name);
create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_user_id_idx on public.analytics_events (user_id);
create index if not exists analytics_events_anonymous_id_idx on public.analytics_events (anonymous_id);
create index if not exists analytics_events_source_idx on public.analytics_events (source);

alter table public.analytics_events enable row level security;

drop policy if exists "Anyone can submit analytics events" on public.analytics_events;
create policy "Anyone can submit analytics events"
  on public.analytics_events
  for insert
  to anon, authenticated
  with check (
    length(event_name) between 2 and 120
  );

-- Keep analytics private. Admin/service-role can read outside RLS.
drop policy if exists "Users cannot read analytics events" on public.analytics_events;
create policy "Users cannot read analytics events"
  on public.analytics_events
  for select
  to authenticated
  using (false);

-- Mark public leads as converted when someone registers/logs in with the same email.
create or replace function public.mark_public_leads_converted(_email text, _user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.public_leads
  set converted_user_id = _user_id,
      converted_at = coalesce(converted_at, now())
  where lower(email) = lower(_email)
    and converted_user_id is null;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

grant execute on function public.mark_public_leads_converted(text, uuid) to anon, authenticated;

comment on table public.analytics_events is 'First-party product and conversion events from public pages and app activation flows.';
comment on function public.mark_public_leads_converted(text, uuid) is 'Marks matching public leads as converted after account creation or login.';
